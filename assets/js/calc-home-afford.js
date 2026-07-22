/* =========================================================
   내집찾기 계산기 (1-1) — 조건 입력 → 살 수 있는 적정 매매가
   공유 코어(HPHome) 사용. 매매가는 출력(역산).
   ========================================================= */

const state = {
  income: 3500, existing: 0, cash: 4000, age: 29,
  region: "수도권_비규제", household: "일반",
  first: true, newborn: false, smallArea: true, hasHouse: false, // 사회초년생 대다수가 생애최초
  dualIncome: false,
  rate: 4.0, years: 30, bank: "은행",
};
let P = null;

const ICO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICO_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

const NAVY = "#1976d2";
const CASH_STEPS = [-3000, 0, 3000, 6000, 10000, 15000]; // 현재 보유 현금 대비 증감(만원)
let monthlySave = 100; // 매달 모을 수 있는 금액(만원)

/* 저축 개월 수를 "N년 M개월"로 표기 */
function durationText(months) {
  if (!isFinite(months) || months <= 0) return "지금 가능";
  const y = Math.floor(months / 12), m = months % 12;
  if (y === 0) return `${m}개월`;
  if (m === 0) return `${y}년`;
  return `${y}년 ${m}개월`;
}

/* 목표 금액까지 모으는 데 걸리는 개월 수 (단순 적립 기준) */
function monthsToSave(amount) {
  if (amount <= 0) return 0;
  if (monthlySave <= 0) return Infinity;
  return Math.ceil(amount / monthlySave);
}

/* 축·라벨용 짧은 금액 표기: 15000 → "1.5억", 3000 → "3,000만" */
function compactMan(v) {
  if (v >= 10000) {
    const eok = v / 10000;
    return (v % 10000 === 0 ? eok : eok.toFixed(1)) + "억";
  }
  return HP.fmtMan(v);
}

/* 보유 현금이 c일 때 살 수 있는 매매가 (state는 변경하지 않음) */
function priceForCash(c) {
  return Math.floor(HPHome.affordablePrice(P, { ...state, cash: c }) / 100) * 100;
}

function render() {
  const price = Math.floor(HPHome.affordablePrice(P, state) / 100) * 100; // 100만 단위 내림(예산 초과 방지)
  const { max, bindKey, limits, term } = HPHome.loanLimits(P, state, price);
  const feeTotal = HPHome.fees(P, state, price);
  const loan = Math.min(max, price);
  const cashUsed = Math.max(0, price + feeTotal - loan);
  const remain = Math.max(0, state.cash - cashUsed);
  const months = term * 12;
  const monthly = HPHome.monthlyPayment(loan, state.rate, months);
  const ownEquity = Math.max(0, price - loan);
  const loanPct = price > 0 ? Math.round((loan / price) * 100) : 0;
  const ownPct = 100 - loanPct;

  document.getElementById("r-price").innerHTML = HP.fmtMan(price) + '<span class="unit"> 원</span>';
  // 생애최초는 기본으로 켜 두므로(사회초년생 대다수가 해당), 적용 사실을 결과에 밝힌다.
  // 해당하지 않는 사람이 '왜 이렇게 높지?'에서 막히지 않도록.
  document.getElementById("r-price-sub").textContent =
    (state.first ? "생애최초 우대 적용 · " : "") +
    `대출 한도는 ${bindKey} 기준 (LTV ${HP.fmtMan(limits.LTV)} · DSR ${HP.fmtMan(limits.DSR)} · 절대캡 ${
      limits.절대캡 === Infinity ? "없음" : HP.fmtMan(limits.절대캡)})`;

  // 상태 배지: DSR이 한도를 묶으면 소득 대비 상환 여력을 최대로 당겨 쓴 것
  const heavyDSR = bindKey === "DSR";
  const badge = document.getElementById("r-badge");
  badge.className = "hero-badge " + (heavyDSR ? "warn" : "ok");
  badge.innerHTML = heavyDSR ? `${ICO_WARN} 상환 부담 최대치` : `${ICO_OK} 상환 여력 여유`;

  // 섹션1 — 지표 카드 4칸
  document.getElementById("r-loan").textContent = HP.fmtMan(loan);
  document.getElementById("r-loan-sub").textContent = `집값의 ${loanPct}%`;
  document.getElementById("r-cashused").textContent = HP.fmtMan(cashUsed);
  document.getElementById("r-cash-sub").textContent = `남는 현금 ${HP.fmtMan(remain)}`;
  document.getElementById("r-fees").textContent = HP.fmtMan(feeTotal);
  document.getElementById("r-monthly").textContent = HP.fmtMan(monthly) + "원";
  const burden = state.income > 0 ? Math.round(((monthly * 12 + state.existing) / state.income) * 100) : 0;
  const msub = document.getElementById("r-monthly-sub");
  msub.className = "ms " + (burden >= 38 ? "warn" : "ok");
  msub.textContent = `소득의 ${burden}%`;

  // 섹션2 — 자금 구성 도넛 (중앙 대출 비중 + 금액 범례)
  HP.donutPanel(document.getElementById("donut"), [
    { value: loan, color: NAVY, label: `대출 (${loanPct}%)`, display: HP.fmtMan(loan) },
    { value: ownEquity, color: "var(--accent)", label: `자기자본 (${ownPct}%)`, display: HP.fmtMan(ownEquity) },
  ], { centerLabel: `${loanPct}%`, centerSub: "대출 비중", centerColor: NAVY });

  // 섹션3 — 현금을 더 모으면 살 수 있는 집값
  renderCashChart(price);

  // 정책대출 인사이트 카드
  const rows = HPHome.policyRows(P, state, loan, price);
  const eligible = rows.filter((r) => r.eligible && r.name !== "일반 주담대");
  let best = null;
  for (const r of eligible) if (!best || r.rate < best.rate) best = r;
  const ico = document.getElementById("r-insight-ico");
  const ititle = document.getElementById("r-insight-title");
  const idesc = document.getElementById("r-insight-desc");
  if (best) {
    ico.textContent = "💡";
    ititle.textContent = `${best.name} 자격이 됩니다 · 금리 ${best.rate.toFixed(2)}%`;
    idesc.innerHTML = `정책대출을 쓰면 이자 부담이 줄어 월 상환액이 낮아져요. <a href="home-goal.html">내집자금 계산기</a>에서 비교해 보세요.`;
  } else {
    ico.textContent = "ℹ️";
    ititle.textContent = "일반 주담대 기준으로 산출했습니다";
    idesc.textContent = "조건에 맞는 정책대출이 있으면 한도·이자가 달라질 수 있어요.";
  }
}

/* 섹션3 — 보유 현금을 늘렸을 때 살 수 있는 매매가 비교 */
function renderCashChart(basePrice) {
  const scen = CASH_STEPS
    .map((d) => ({ delta: d, cash: state.cash + d }))
    .filter((s) => s.cash > 0)
    .map((s) => ({ ...s, price: priceForCash(s.cash) }));

  HP.scenarioBars(document.getElementById("cash-chart"), {
    axisFmt: (v) => (v ? compactMan(v) : "0"),
    items: scen.map((s) => {
      const diff = s.price - basePrice;
      return {
        label: s.delta === 0 ? "지금" : (s.delta > 0 ? "+" : "−") + compactMan(Math.abs(s.delta)),
        sub: compactMan(s.cash),
        value: s.price,
        current: s.delta === 0,
        tipTitle: `현금 ${HP.fmtMan(s.cash)}`,
        tip: [
          { k: "살 수 있는 집", v: HP.fmtMan(s.price) + "원" },
          { k: "지금 대비", v: diff === 0 ? "기준" : (diff > 0 ? "+" : "−") + HP.fmtMan(Math.abs(diff)) },
          { k: "모으는 기간", v: s.delta > 0 ? durationText(monthsToSave(s.delta)) : "지금 가능" },
        ],
      };
    }),
  });

  // 대출이 한도에 묶여 현금 증가분만큼만 집값이 오르기 시작하는 지점
  let capIdx = -1;
  for (let i = 1; i < scen.length; i++) {
    const dCash = scen[i].cash - scen[i - 1].cash;
    const dPrice = scen[i].price - scen[i - 1].price;
    if (dCash > 0 && dPrice <= dCash * 1.15) { capIdx = i - 1; break; }
  }
  document.getElementById("cash-note").innerHTML =
    capIdx >= 0
      ? `📌 현금 <b>${HP.fmtMan(scen[capIdx].cash)}</b>부터는 <b>대출 한도</b>에 걸려서, 모은 금액만큼만 집값이 올라갑니다. 그 전까지는 현금 1을 모으면 집값은 여러 배로 올라요.`
      : `현금을 모을수록 대출 한도도 같이 올라가서, <b>모은 돈보다 더 큰 폭</b>으로 살 수 있는 집값이 올라갑니다.`;

  renderSaveNote(scen, basePrice);
}

/* 월 저축액 기준 도달 시점 안내 + 자산목표 계산기 연결 */
function renderSaveNote(scen, basePrice) {
  const note = document.getElementById("save-note");
  if (monthlySave <= 0) {
    note.innerHTML = `매달 모을 수 있는 금액을 입력하면, 목표 현금까지 <b>얼마나 걸리는지</b> 알려드려요.`;
    return;
  }
  // 대표 목표 2개(가장 가까운 증액 구간, 그다음 구간)를 골라 안내
  const ups = scen.filter((s) => s.delta > 0);
  if (!ups.length) {
    note.innerHTML = `🎯 매달 <b>${HP.fmtMan(monthlySave)}</b>씩 모으는 계획을 <a href="goal.html">자산목표 계산기</a>에서 세워보세요.`;
    return;
  }
  const pick = [ups[1] || ups[0], ups[ups.length - 1]].filter((v, i, a) => a.indexOf(v) === i);
  const parts = pick.map(
    (s) => `<b>${durationText(monthsToSave(s.delta))}</b> 뒤 <b>${HP.fmtMan(s.price)}</b>짜리 집`
  );
  note.innerHTML =
    `🎯 매달 <b>${HP.fmtMan(monthlySave)}원</b>씩 모으면 ${parts.join(", ")}을 살 수 있어요. ` +
    `투자수익까지 감안하면 더 빨라질 수 있어요 — <a href="goal.html">자산목표 계산기</a>에서 계획을 세워보세요.`;
}

function bindChips(id, key) {
  const box = document.getElementById(id);
  box.querySelectorAll(".chip").forEach((c) => c.onclick = () => {
    box.querySelectorAll(".chip").forEach((x) => x.classList.remove("on"));
    c.classList.add("on"); state[key] = c.dataset.v; render();
  });
}
function bindInputs() {
  ["income", "existing", "cash", "rate", "years", "age"].forEach((id) => {
    document.getElementById(id).oninput = (e) => { state[id] = +e.target.value || 0; render(); };
  });
  document.getElementById("save").oninput = (e) => { monthlySave = Math.max(0, +e.target.value || 0); render(); };
  document.getElementById("dual-income").onchange = (e) => { state.dualIncome = e.target.checked; render(); };
  document.getElementById("no-house").onchange = (e) => { state.hasHouse = !e.target.checked; render(); };
  document.getElementById("first").onchange = (e) => { state.first = e.target.checked; render(); };
  document.getElementById("newborn").onchange = (e) => { state.newborn = e.target.checked; render(); };
  document.getElementById("small-area").onchange = (e) => { state.smallArea = e.target.checked; render(); };
  bindChips("region", "region");
  bindChips("household", "household");
  bindChips("bank", "bank");
}

/* 링크로 넘어온 값 반영 — 외부 입력이라 범위를 검증한다 */
function applyIncoming() {
  const IN = HP.readParams({
    cash: { min: 0, max: 1000000 },
    income: { min: 0, max: 1000000 },
    existing: { min: 0, max: 100000 },
    age: { min: 19, max: 70 },
    rate: { min: 0, max: 20 },
    years: { min: 1, max: 50 },
    region: { allow: ["수도권_규제", "수도권_비규제", "지방"] },
    household: { allow: ["일반", "신혼", "1자녀", "2자녀"] },
  });
  Object.assign(state, IN);
  ["cash", "income", "existing", "age", "rate", "years"].forEach((id) => {
    if (IN[id] !== undefined) document.getElementById(id).value = state[id];
  });
  ["region", "household"].forEach((k) => {
    if (IN[k] === undefined) return;
    document.querySelectorAll(`#${k} .chip`).forEach((c) => c.classList.toggle("on", c.dataset.v === IN[k]));
  });
  HP.refreshAmountHints();
  HP.refreshAdvanced(); // 링크 값이 접힌 영역에 있으면 펼친다

  const got = [];
  if (IN.cash !== undefined) got.push({ k: "종잣돈", v: HP.fmtMan(state.cash) + "원" });
  if (IN.income !== undefined) got.push({ k: "연 소득", v: HP.fmtMan(state.income) + "원" });
  HP.handoffNotice(document.getElementById("result-col"), got);
}

HP.mount("home-afford");
HPPolicy.loadPolicy().then((data) => {
  P = data;
  HPPolicy.renderPolicyDate(document.getElementById("policy-date"), data);
  bindInputs();
  applyIncoming();
  render();
  HP.initShare(document.getElementById("share"), () => ({
    cash: state.cash, income: state.income, existing: state.existing, age: state.age,
    rate: state.rate, years: state.years, region: state.region, household: state.household,
    from: "home-afford",
  }));
});
