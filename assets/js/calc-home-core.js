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
    let eligible = true, reason = "";
    const houseCap = state.household === "신혼" || state.household === "2자녀"
      ? pl.house_cap_special_man : pl.house_cap_man;
    if (price > houseCap) { eligible = false; reason = `주택 ${HP.fmtMan(houseCap)} 이하`; }
    if (pl.requires_newborn && !state.newborn) { eligible = false; reason = "최근 2년 내 출산"; }
    if (pl.id === "newborn" && !state.smallArea) { eligible = false; reason = "전용 85㎡ 이하"; }
    if (pl.age_max && state.age > pl.age_max) { eligible = false; reason = `만 ${pl.age_max}세 이하`; }
    if (pl.income_cap_man && state.income > pl.income_cap_man) { eligible = false; reason = `소득 ${HP.fmtMan(pl.income_cap_man)} 이하`; }
    let limit = pl.limit_general_man;
    if (state.household === "신혼" || state.household === "2자녀") limit = pl.limit_special_man;
    else if (state.first) limit = pl.limit_first_man;
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
