/* =========================================================
   내집찾기 계산기 (1-1) — 조건 입력 → 살 수 있는 적정 매매가
   공유 코어(HPHome) 사용. 매매가는 출력(역산).
   ========================================================= */

const state = {
  income: 6000, existing: 0, cash: 15000, age: 34,
  region: "수도권_비규제", household: "일반",
  first: false, newborn: false, smallArea: true,
  rate: 4.0, years: 30, bank: "은행",
};
let P = null;

const ICO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICO_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

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
  document.getElementById("r-price-sub").textContent =
    `대출 한도는 ${bindKey} 기준 (LTV ${HP.fmtMan(limits.LTV)} · DSR ${HP.fmtMan(limits.DSR)} · 절대캡 ${
      limits.절대캡 === Infinity ? "없음" : HP.fmtMan(limits.절대캡)})`;

  // 상태 배지: DSR이 한도를 묶으면 소득 대비 상환 여력을 최대로 당겨 쓴 것
  const heavyDSR = bindKey === "DSR";
  const badge = document.getElementById("r-badge");
  badge.className = "hero-badge " + (heavyDSR ? "warn" : "ok");
  badge.innerHTML = heavyDSR ? `${ICO_WARN} 상환 부담 최대치` : `${ICO_OK} 상환 여력 여유`;

  // 지표 카드 3칸
  document.getElementById("r-loan").textContent = HP.fmtMan(loan);
  document.getElementById("r-loan-sub").textContent = `월 ${HP.fmtMan(monthly)}원 상환`;
  document.getElementById("r-cashused").textContent = HP.fmtMan(cashUsed);
  document.getElementById("r-cash-sub").textContent = `부대비용 ${HP.fmtMan(feeTotal)} 포함`;
  document.getElementById("r-remain").textContent = HP.fmtMan(remain);
  const remainLow = remain < 500; // 500만원 미만이면 예비비 부족 경고
  const rsub = document.getElementById("r-remain-sub");
  rsub.className = "ms " + (remainLow ? "warn" : "ok");
  rsub.textContent = remainLow ? "예비비 거의 소진" : "예비비 확보";

  // 자금 구성 도넛 (중앙 대출 비중 + 금액 범례)
  HP.donutPanel(document.getElementById("donut"), [
    { value: loan, color: "#2b3245", label: `대출 (${loanPct}%)`, display: HP.fmtMan(loan) },
    { value: ownEquity, color: "var(--accent)", label: `자기자본 (${ownPct}%)`, display: HP.fmtMan(ownEquity) },
  ], { centerLabel: `${loanPct}%`, centerSub: "대출 비중" });

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
  document.getElementById("first").onchange = (e) => { state.first = e.target.checked; render(); };
  document.getElementById("newborn").onchange = (e) => { state.newborn = e.target.checked; render(); };
  document.getElementById("small-area").onchange = (e) => { state.smallArea = e.target.checked; render(); };
  bindChips("region", "region");
  bindChips("household", "household");
  bindChips("bank", "bank");
}

HP.mount("home-afford");
HPPolicy.loadPolicy().then((data) => {
  P = data;
  document.getElementById("policy-date").textContent = data.meta.updated_at;
  bindInputs();
  render();
});
