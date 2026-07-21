/* =========================================================
   내집마련 계산 — 공유 코어 로직 (DOM 없음, 순수 함수)
   home-afford(내집찾기) / home-goal(내집자금) 이 함께 사용.
   모든 정책 상수는 policy.json(P)에서 주입받는다.
   단위: 금액은 '만원'.
   ========================================================= */

/* 원리금균등 */
function monthlyPayment(principal, annualPct, months) {
  const r = annualPct / 100 / 12;
  if (principal <= 0) return 0;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}
function principalFromMonthly(payment, annualPct, months) {
  const r = annualPct / 100 / 12;
  if (payment <= 0) return 0;
  if (r === 0) return payment * months;
  return (payment * (1 - Math.pow(1 + r, -months))) / r;
}

/* 나이 반영: 완납 시점이 79세를 넘지 않도록 만기 상한 (10~40년) */
function effectiveTermYears(state) {
  const byAge = Math.max(10, Math.min(40, 79 - (state.age || 35)));
  return Math.min(state.years || 30, byAge);
}

function regionMeta(P, region) {
  if (region === "지방") return { ltvKey: "지방_비규제", stress: P.stress_rate.지방, capArr: [] };
  return { ltvKey: region, stress: P.stress_rate.수도권, capArr: P.loan_abs_cap.수도권 };
}

function ltvRate(P, state) {
  const cat = state.first ? "생애최초" : "일반";
  return P.ltv[cat][regionMeta(P, state.region).ltvKey];
}

function absCap(P, state, price) {
  const { capArr } = regionMeta(P, state.region);
  if (!capArr.length) return Infinity;
  for (const tier of capArr) if (price <= tier.max_price) return tier.cap;
  return capArr[capArr.length - 1].cap;
}

/* 대출 한도 3제약: LTV / DSR(스트레스, 나이반영 만기) / 절대캡 */
function loanLimits(P, state, price) {
  const term = effectiveTermYears(state);
  const months = term * 12;
  const ltvCap = price * ltvRate(P, state);
  const { stress } = regionMeta(P, state.region);
  const dsrRate = P.dsr[state.bank];
  const stressedRate = state.rate + stress;
  const maxAnnualPay = state.income * dsrRate - state.existing; // 만원/년
  const dsrCap = principalFromMonthly(maxAnnualPay / 12, stressedRate, months);
  const cap = absCap(P, state, price);
  const limits = { LTV: ltvCap, DSR: Math.max(0, dsrCap), 절대캡: cap };
  let bindKey = "LTV", min = Infinity;
  for (const k in limits) if (limits[k] < min) { min = limits[k]; bindKey = k; }
  return { max: Math.max(0, min), bindKey, limits, term };
}

/* 세금·중개보수 (만원) */
function acquisitionTax(P, state, price) {
  let rate;
  if (price <= 60000) rate = P.acquisition_tax.under_6eok;
  else if (price >= 90000) rate = P.acquisition_tax.over_9eok;
  else rate = 0.011 + ((price - 60000) / 30000) * (0.033 - 0.011);
  let tax = price * rate;
  if (state.first) tax = Math.max(0, tax - P.acquisition_tax.first_home_max_discount_man);
  return tax;
}
function brokerFee(price) {
  let rate, cap = Infinity;
  if (price < 5000) { rate = 0.006; cap = 25; }
  else if (price < 20000) { rate = 0.005; cap = 80; }
  else if (price < 90000) rate = 0.004;
  else if (price < 120000) rate = 0.005;
  else if (price < 150000) rate = 0.006;
  else rate = 0.007;
  return Math.min(price * rate, cap);
}
function fees(P, state, price) {
  return acquisitionTax(P, state, price) + brokerFee(price);
}

/* 보유 현금으로 살 수 있는 적정 매매가 (이진탐색) */
function affordablePrice(P, state) {
  const req = (price) => {
    const { max } = loanLimits(P, state, price);
    const loan = Math.min(max, price);
    return price + fees(P, state, price) - loan; // 필요 현금
  };
  let lo = 0, hi = 300000;
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    if (req(mid) <= state.cash) lo = mid;
    else hi = mid;
  }
  return lo;
}

/* 정책대출 비교 rows */
/* 세대 유형별 소득 상한 (해당되는 것 중 가장 유리한 값 적용)
   예) 디딤돌 — 일반 6천 / 생애최초·2자녀 7천 / 신혼 8,500만 */
function incomeCapFor(pl, state) {
  const caps = [];
  if (pl.income_cap_man) caps.push(pl.income_cap_man);
  if (state.dualIncome && pl.income_cap_dual_man) caps.push(pl.income_cap_dual_man);
  if (state.first && pl.income_cap_first_man) caps.push(pl.income_cap_first_man);
  if (state.household === "신혼" && pl.income_cap_newlywed_man) caps.push(pl.income_cap_newlywed_man);
  if (state.household === "1자녀" && pl.income_cap_1child_man) caps.push(pl.income_cap_1child_man);
  if (state.household === "2자녀" && pl.income_cap_multichild_man) caps.push(pl.income_cap_multichild_man);
  return caps.length ? Math.max(...caps) : null;
}

/* 세대 유형별 대출 한도 (해당되는 것 중 가장 큰 값)
   상품마다 우대 대상이 달라 데이터에 있는 항목만 반영한다.
   예) 디딤돌은 신혼·2자녀 모두 3.2억이지만, 보금자리론은 다자녀만 4억(신혼 우대 없음) */
function limitFor(pl, state) {
  const cands = [pl.limit_general_man || 0];
  if (state.first && pl.limit_first_man) cands.push(pl.limit_first_man);
  const legacySpecial = pl.limit_special_man || 0; // 구 스키마 호환
  if (state.household === "신혼") cands.push(pl.limit_newlywed_man || legacySpecial);
  if (state.household === "1자녀") cands.push(pl.limit_1child_man || 0);
  if (state.household === "2자녀") cands.push(pl.limit_multichild_man || legacySpecial);
  return Math.max(...cands);
}

function policyRows(P, state, loanNeeded, price) {
  const months = effectiveTermYears(state) * 12;
  const rows = [];
  const { max } = loanLimits(P, state, price);
  const genLoan = Math.min(max, loanNeeded);
  rows.push({
    name: "일반 주담대", eligible: true, reason: "", limit: max,
    rate: state.rate, monthly: monthlyPayment(genLoan, state.rate, months), loan: genLoan,
  });
  for (const pl of P.policy_loans || []) {
    const reasons = [];
    const houseCap = state.household === "신혼" || state.household === "2자녀"
      ? pl.house_cap_special_man : pl.house_cap_man;
    if (price > houseCap) reasons.push(`주택 ${HP.fmtMan(houseCap)} 이하`);
    if (pl.requires_newborn && !state.newborn) reasons.push("최근 2년 내 출산");
    if (pl.requires_small_area && !state.smallArea) reasons.push("전용 85㎡ 이하");
    if (pl.requires_no_house && state.hasHouse) reasons.push("무주택 세대주");
    if (pl.age_max && state.age > pl.age_max) reasons.push(`만 ${pl.age_max}세 이하`);
    const incCap = incomeCapFor(pl, state);
    if (incCap && state.income > incCap) reasons.push(`소득 ${HP.fmtMan(incCap)} 이하`);
    // 순자산은 별도 입력이 없어 보유 현금으로 하한만 검증(현금만으로 이미 초과면 확실히 불가)
    if (pl.net_worth_cap_man && state.cash > pl.net_worth_cap_man) reasons.push(`순자산 ${HP.fmtMan(pl.net_worth_cap_man)} 이하`);
    const eligible = reasons.length === 0;
    const reason = reasons.slice(0, 2).join(" · ");
    const limit = limitFor(pl, state);
    const loan = eligible ? Math.min(limit, loanNeeded) : 0;
    rows.push({
      name: pl.name, eligible, reason, limit,
      rate: pl.rate_min, rateMax: pl.rate_max,
      monthly: eligible ? monthlyPayment(loan, pl.rate_min, months) : 0, loan,
    });
  }
  return rows;
}

window.HPHome = {
  monthlyPayment, principalFromMonthly, effectiveTermYears,
  regionMeta, ltvRate, absCap, loanLimits,
  acquisitionTax, brokerFee, fees, affordablePrice, policyRows,
};
