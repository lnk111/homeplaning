/* =========================================================
   전세 계산기 — 보증금 입력 → 필요한 현금·대출·월 이자
   정책 전세대출(버팀목 계열)은 policy.json의 jeonse_loans에서 주입.
   단위: 금액은 '만원'.
   ========================================================= */

const state = {
  deposit: 18000, income: 3500, cash: 3000, age: 28,
  region: "수도권", household: "일반",
  smallArea: true, hasHouse: false,
  rate: 3.5, marketPrice: 0, // 매매 시세(선택) — 전세가율 계산용
  monthlyDeposit: 5000, convRate: 4.5, yieldRate: 4, // 월세 전환 비교용
};
let P = null;

const ICO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICO_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';
const NAVY = "#1976d2";

/* 전세가율 위험 구간 — 보증금이 매매가에 근접할수록 반환 위험이 커진다 */
const RATIO_WARN = 80;   // 이 이상이면 주의
const RATIO_DANGER = 90; // 이 이상이면 위험(깡통전세)

const isCapital = () => state.region === "수도권";

/* 상품별 보증금 상한·한도·소득 상한 */
function depositCap(pl) {
  return isCapital() ? pl.deposit_cap_capital_man : pl.deposit_cap_local_man;
}
function loanCap(pl) {
  return isCapital() ? pl.limit_capital_man : pl.limit_local_man;
}
function incomeCap(pl) {
  const caps = [pl.income_cap_man];
  if (state.household === "신혼" && pl.income_cap_newlywed_man) caps.push(pl.income_cap_newlywed_man);
  return Math.max(...caps.filter(Boolean));
}

/* 상품 자격 판정 + 대출 가능액 */
function jeonseRows() {
  const rows = [];
  for (const pl of P.jeonse_loans || []) {
    const reasons = [];
    const dCap = depositCap(pl);
    if (state.deposit > dCap) reasons.push(`보증금 ${HP.fmtMan(dCap)} 이하`);
    if (pl.requires_no_house && state.hasHouse) reasons.push("무주택 세대주");
    if (pl.requires_small_area && !state.smallArea) reasons.push("전용 85㎡ 이하");
    if (pl.requires_newlywed && state.household !== "신혼") reasons.push("신혼(혼인 7년 내)");
    if (pl.age_min && state.age < pl.age_min) reasons.push(`만 ${pl.age_min}세 이상`);
    if (pl.age_max && state.age > pl.age_max) reasons.push(`만 ${pl.age_max}세 이하`);
    const iCap = incomeCap(pl);
    if (iCap && state.income > iCap) reasons.push(`소득 ${HP.fmtMan(iCap)} 이하`);
    // 순자산은 별도 입력이 없어 보유 현금으로 하한만 검증
    if (pl.net_worth_cap_man && state.cash > pl.net_worth_cap_man) reasons.push(`순자산 ${HP.fmtMan(pl.net_worth_cap_man)} 이하`);

    const eligible = reasons.length === 0;
    // 보증금의 일정 비율 / 상품 한도 / 실제 필요액 중 가장 작은 값
    const need = Math.max(0, state.deposit - state.cash);
    const byRatio = state.deposit * pl.ltv_ratio;
    const limit = Math.min(byRatio, loanCap(pl));
    const loan = eligible ? Math.min(limit, need) : 0;
    rows.push({
      name: pl.name, eligible, reason: reasons.slice(0, 2).join(" · "),
      limit, loan, rate: pl.rate_min, rateMax: pl.rate_max,
      monthly: loan * (pl.rate_min / 100) / 12, // 전세대출은 이자만 납입
      ratio: pl.ltv_ratio, term: pl.term_years, maxTerm: pl.max_term_years,
    });
  }
  return rows;
}

function render() {
  const rows = jeonseRows();
  const eligible = rows.filter((r) => r.eligible);
  let best = null;
  for (const r of eligible) if (!best || r.rate < best.rate) best = r;

  // 자격 상품이 없으면 일반 은행 전세대출(입력 금리) 기준으로 계산
  const need = Math.max(0, state.deposit - state.cash);
  const bankLimit = Math.min(state.deposit * 0.8, need);
  const loan = best ? best.loan : bankLimit;
  const usedRate = best ? best.rate : state.rate;
  const cashUsed = Math.max(0, state.deposit - loan);
  const shortfall = Math.max(0, cashUsed - state.cash);
  const monthlyInterest = loan * (usedRate / 100) / 12;
  const ownPct = state.deposit > 0 ? Math.round((cashUsed / state.deposit) * 100) : 0;
  const loanPct = 100 - ownPct;

  // 히어로 — 추가로 더 필요한 현금
  document.getElementById("r-need").innerHTML =
    (shortfall > 0 ? HP.fmtMan(shortfall) : "충분") + (shortfall > 0 ? '<span class="unit"> 원</span>' : "");
  document.getElementById("r-need-sub").textContent = best
    ? `${best.name} 기준 (보증금의 ${Math.round(best.ratio * 100)}%·최대 ${HP.fmtMan(best.limit)})`
    : `정책대출 자격이 없어 일반 전세대출(금리 ${state.rate}%) 기준`;
  const badge = document.getElementById("r-badge");
  badge.className = "hero-badge " + (shortfall > 0 ? "warn" : "ok");
  badge.innerHTML = shortfall > 0 ? `${ICO_WARN} 자금 부족` : `${ICO_OK} 자금 충분`;

  // 지표 4칸
  document.getElementById("r-loan").textContent = HP.fmtMan(loan);
  document.getElementById("r-loan-sub").textContent = `보증금의 ${loanPct}%`;
  document.getElementById("r-cash").textContent = HP.fmtMan(cashUsed);
  document.getElementById("r-cash-sub").textContent = `보유 현금 ${HP.fmtMan(state.cash)}`;
  document.getElementById("r-monthly").textContent = HP.fmtMan(monthlyInterest) + "원";
  const burden = state.income > 0 ? Math.round(((monthlyInterest * 12) / state.income) * 100) : 0;
  const msub = document.getElementById("r-monthly-sub");
  msub.className = "ms " + (burden >= 25 ? "warn" : "ok");
  msub.textContent = `소득의 ${burden}%`;
  document.getElementById("r-rate").textContent = usedRate.toFixed(2) + "%";
  document.getElementById("r-rate-sub").textContent = best ? best.name : "일반 전세대출";

  // 보증금 구성 도넛
  HP.donutPanel(document.getElementById("donut"), [
    { value: loan, color: NAVY, label: `전세대출 (${loanPct}%)`, display: HP.fmtMan(loan) },
    { value: cashUsed, color: "var(--accent)", label: `내 현금 (${ownPct}%)`, display: HP.fmtMan(cashUsed) },
  ], { centerLabel: `${loanPct}%`, centerSub: "대출 비중", centerColor: NAVY });

  renderRatio();
  renderRent(monthlyInterest, cashUsed);
  renderTable(rows, best);
}

/* 전세 → 월세 전환. 전월세전환율은 (전세금 − 월세보증금)에만 적용된다. */
const won = (man) => HP.fmtMan(man) + "원"; // 월 단위 금액은 상단 지표와 같은 '만원' 표기로

function renderRent(monthlyInterest, cashUsed) {
  const formula = document.getElementById("rent-formula");
  const note = document.getElementById("rent-note");
  const body = document.querySelector("#rent-table tbody");

  const convBase = Math.max(0, state.deposit - state.monthlyDeposit);
  const rent = convBase * (state.convRate / 100) / 12;
  // 월세를 택하면 전세 보증금에 묶였을 내 현금 중 일부가 손에 남는다
  const freeCash = Math.max(0, cashUsed - state.monthlyDeposit);
  const oppGain = freeCash * (state.yieldRate / 100) / 12;
  const extra = rent - monthlyInterest;   // 월세가 매달 더 나가는 돈
  const net = extra - oppGain;            // 양수면 전세가 유리

  formula.innerHTML = convBase > 0
    ? `월세 = (${HP.fmtMan(state.deposit)} − ${HP.fmtMan(state.monthlyDeposit)}) × ${state.convRate}% ÷ 12
       = <b>월 ${won(rent)}</b>`
    : `월세 보증금이 전세 보증금 이상이라 <b>전환할 금액이 없습니다</b>.`;

  const ok = convBase > 0; // 전환할 금액이 없으면 월세 쪽 수치는 의미가 없다
  body.innerHTML = [
    ["보증금", HP.fmtMan(state.deposit), ok ? HP.fmtMan(state.monthlyDeposit) : "–", false],
    ["월 지출", `대출이자 ${won(monthlyInterest)}`, ok ? won(rent) : "–", true],
    ["묶이는 내 돈", HP.fmtMan(cashUsed), ok ? HP.fmtMan(state.monthlyDeposit) : "–", false],
    ["손에 남는 돈", "–", ok && freeCash > 0 ? HP.fmtMan(freeCash) : "–", false],
  ].map(([k, a, b, hi]) =>
    `<tr><td>${k}</td><td${hi ? ' class="net"' : ""}>${a}</td><td${hi ? ' class="net"' : ""}>${b}</td></tr>`
  ).join("");

  if (convBase <= 0) {
    note.innerHTML = `월세 보증금을 전세 보증금보다 <b>낮게</b> 넣어야 전환 금액이 계산됩니다.`;
    return;
  }

  const parts = [];
  if (extra > 0) {
    parts.push(`월세가 매달 <b>${won(extra)}</b> 더 나가는 대신, 손에 쥐는 ${HP.fmtMan(freeCash)}을
      연 ${state.yieldRate}%로 굴리면 월 ${won(oppGain)}입니다.`);
  } else {
    parts.push(`월세가 전세 대출이자보다 오히려 <b>${won(-extra)}</b> 적게 나갑니다.`);
  }
  const gap = Math.abs(net);
  parts.push(Math.round(gap) === 0
    ? `이 조건에선 <b>전세와 월세가 사실상 비슷</b>합니다. 목돈을 굴릴 곳이 확실한지로 정하세요.`
    : net > 0
      ? `이 조건에선 <b>전세가 월 ${won(gap)} 유리</b>합니다.`
      : `이 조건에선 <b>월세가 월 ${won(gap)} 유리</b>합니다.`);

  // 보증금 반환 위험이 큰 집이라면 금액 비교와 별개로 월세가 안전할 수 있다
  const ratio = state.marketPrice ? (state.deposit / state.marketPrice) * 100 : 0;
  if (ratio >= RATIO_WARN) {
    parts.push(`다만 전세가율이 <b>${ratio.toFixed(1)}%</b>로 높습니다.
      숫자가 조금 불리해도, 떼일 보증금이 적은 <b>월세가 안전한 선택</b>일 수 있어요.`);
  }
  parts.push(`전환율 법정 상한은 <b>기준금리+2%와 연 10% 중 낮은 값</b>이며,
    계약 기간 중·갱신요구권 행사 때만 적용됩니다(신규 계약엔 미적용).
    <a href="../guide/jeonse.html" style="color:var(--accent);font-weight:700">자세히 보기 →</a>`);
  note.innerHTML = parts.join(" ");
}

/* 전세가율 — 보증금이 매매 시세에 얼마나 근접한지 (반환 위험 신호) */
function renderRatio() {
  const bar = document.getElementById("ratio-bar");
  const note = document.getElementById("ratio-note");
  if (!state.marketPrice) {
    bar.style.width = "0%";
    document.getElementById("ratio-val").textContent = "–";
    note.innerHTML = `이 집의 <b>매매 시세</b>를 넣으면 전세가율을 계산해 드립니다.
      전세가율이 높을수록 집값이 떨어졌을 때 <b>보증금을 돌려받기 어려워집니다</b>.`;
    return;
  }
  const ratio = (state.deposit / state.marketPrice) * 100;
  document.getElementById("ratio-val").textContent = ratio.toFixed(1) + "%";
  bar.style.width = Math.min(100, ratio) + "%";
  if (ratio >= RATIO_DANGER) {
    bar.style.background = "var(--bad)";
    note.innerHTML = `🚨 전세가율 <b>${ratio.toFixed(1)}%</b> — 집값이 조금만 떨어져도 보증금이 매매가를 넘어섭니다(깡통전세).
      <b>전세보증금 반환보증(HUG·HF·SGI) 가입은 필수</b>로 보시고, 등기부등본의 선순위 근저당도 꼭 확인하세요.`;
  } else if (ratio >= RATIO_WARN) {
    bar.style.background = "var(--warn)";
    note.innerHTML = `⚠️ 전세가율 <b>${ratio.toFixed(1)}%</b> — 다소 높은 편입니다.
      <b>전세보증금 반환보증</b> 가입을 권합니다. 집주인의 세금 체납·선순위 대출 여부도 확인하세요.`;
  } else {
    bar.style.background = "var(--good)";
    note.innerHTML = `✅ 전세가율 <b>${ratio.toFixed(1)}%</b> — 비교적 안정적인 구간입니다.
      그래도 계약 전 <b>등기부등본 확인</b>과 <b>확정일자·전입신고</b>는 반드시 하세요.`;
  }
}

function renderTable(rows, best) {
  document.querySelector("#loan-table tbody").innerHTML = rows.map((r) => {
    const isBest = best && r.name === best.name;
    return `<tr class="${isBest ? "best" : ""}">
      <td>${r.name}${isBest ? ' <span class="badge best">추천</span>' : ""}</td>
      <td>${r.eligible ? "✅" : `<span class="badge na">불가</span><div class="small muted">${r.reason}</div>`}</td>
      <td>${HP.fmtMan(r.limit)}</td>
      <td>${r.rate.toFixed(2)}%${r.rateMax && r.rateMax !== r.rate ? `~${r.rateMax.toFixed(2)}` : ""}</td>
      <td class="net">${r.eligible ? won(r.monthly) : "–"}</td></tr>`;
  }).join("");
  document.getElementById("loan-note").innerHTML = best
    ? `'<b>${best.name}</b>'이(가) 금리 ${best.rate.toFixed(2)}%로 가장 유리합니다.
       전세대출은 원금을 갚지 않고 <b>이자만</b> 내다가 만기에 보증금으로 상환합니다(${best.term}년 단위, 최장 ${best.maxTerm}년).`
    : `조건에 맞는 정책 전세대출이 없어 <b>일반 은행 전세대출</b> 기준으로 계산했습니다.
       은행 상품은 보증기관(HUG·HF·SGI)에 따라 한도·금리가 달라집니다.`;
}

function bindChips(id, key) {
  const box = document.getElementById(id);
  box.querySelectorAll(".chip").forEach((c) => c.onclick = () => {
    box.querySelectorAll(".chip").forEach((x) => x.classList.remove("on"));
    c.classList.add("on"); state[key] = c.dataset.v; render();
  });
}
function bindInputs() {
  ["deposit", "income", "cash", "age", "rate", "marketPrice",
   "monthlyDeposit", "convRate", "yieldRate"].forEach((id) => {
    const el = document.getElementById(id);
    el.oninput = (e) => { state[id] = +e.target.value || 0; render(); };
  });
  document.getElementById("no-house").onchange = (e) => { state.hasHouse = !e.target.checked; render(); };
  document.getElementById("small-area").onchange = (e) => { state.smallArea = e.target.checked; render(); };
  bindChips("region", "region");
  bindChips("household", "household");
}

/* 링크로 넘어온 값 반영 — 외부 입력이라 범위를 검증한다 */
function applyIncoming() {
  const IN = HP.readParams({
    deposit: { min: 0, max: 1000000 }, cash: { min: 0, max: 1000000 },
    income: { min: 0, max: 1000000 }, age: { min: 19, max: 65 },
    marketPrice: { min: 0, max: 1000000 }, rate: { min: 0, max: 20 },
    monthlyDeposit: { min: 0, max: 1000000 }, convRate: { min: 0, max: 20 },
    yieldRate: { min: 0, max: 30 },
    region: { allow: ["수도권", "지방"] },
    household: { allow: ["일반", "신혼"] },
  });
  Object.assign(state, IN);
  ["deposit", "cash", "income", "age", "marketPrice", "rate",
   "monthlyDeposit", "convRate", "yieldRate"].forEach((id) => {
    if (IN[id] !== undefined) document.getElementById(id).value = state[id];
  });
  ["region", "household"].forEach((k) => {
    if (IN[k] === undefined) return;
    document.querySelectorAll(`#${k} .chip`).forEach((c) => c.classList.toggle("on", c.dataset.v === IN[k]));
  });
  HP.refreshAmountHints();

  const got = [];
  if (IN.cash !== undefined) got.push({ k: "보유 현금", v: HP.fmtMan(state.cash) + "원" });
  if (IN.income !== undefined) got.push({ k: "연 소득", v: HP.fmtMan(state.income) + "원" });
  HP.handoffNotice(document.getElementById("result-col"), got);
}

HP.mount("jeonse");
HPPolicy.loadPolicy().then((data) => {
  P = data;
  HPPolicy.renderPolicyDate(document.getElementById("policy-date"), data);
  bindInputs();
  applyIncoming();
  render();
  HP.initShare(document.getElementById("share"), () => ({
    deposit: state.deposit, cash: state.cash, income: state.income, age: state.age,
    marketPrice: state.marketPrice || "", region: state.region, household: state.household,
    monthlyDeposit: state.monthlyDeposit, convRate: state.convRate, yieldRate: state.yieldRate,
    from: "jeonse",
  }));
});
