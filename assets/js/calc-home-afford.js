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

  document.getElementById("r-price").innerHTML = HP.fmtMan(price) + '<span class="unit"> 원</span>';
  document.getElementById("r-price-sub").textContent =
    `대출 한도는 ${bindKey} 기준 (LTV ${HP.fmtMan(limits.LTV)} · DSR ${HP.fmtMan(limits.DSR)} · 절대캡 ${
      limits.절대캡 === Infinity ? "없음" : HP.fmtMan(limits.절대캡)})`;

  document.getElementById("r-loan").textContent = HP.fmtMan(loan);
  document.getElementById("r-cashused").textContent = HP.fmtMan(cashUsed);
  document.getElementById("r-fees").textContent = HP.fmtMan(feeTotal);
  document.getElementById("r-remain").textContent = HP.fmtMan(remain);
  document.getElementById("r-monthly").textContent = HP.fmtManWon(monthly);

  HP.donut(document.getElementById("donut"), [
    { value: loan, color: "var(--navy)", label: "대출" },
    { value: ownEquity, color: "var(--accent)", label: "자기자본" },
  ]);

  // 정책대출 활용 안내
  const rows = HPHome.policyRows(P, state, loan, price);
  const eligible = rows.filter((r) => r.eligible && r.name !== "일반 주담대");
  let best = null;
  for (const r of eligible) if (!best || r.rate < best.rate) best = r;
  document.getElementById("policy-hint").innerHTML = best
    ? `💡 <strong>${best.name}</strong>(금리 ${best.rate.toFixed(2)}%) 자격이 됩니다. 정책대출을 쓰면 이자 부담이 줄어 더 좋은 조건이 될 수 있어요. <a href="home-goal.html" style="color:var(--accent);font-weight:700">내집자금 계산기</a>에서 비교해 보세요.`
    : `일반 주담대 기준으로 산출했습니다. 조건에 맞는 정책대출이 있으면 한도·이자가 달라질 수 있어요.`;
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
