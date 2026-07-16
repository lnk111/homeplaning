/* =========================================================
   내집자금 계산기 (1-2) — 매매가 입력 → 필요한 돈 계산
   공유 코어(HPHome) 사용.
   ========================================================= */

const state = {
  price: 50000, income: 6000, existing: 0, cash: 15000,
  region: "수도권_비규제", household: "일반",
  first: false, newborn: false, smallArea: true,
  rate: 4.0, years: 30, age: 34, bank: "은행",
};
let P = null;

function render() {
  const { max, bindKey, limits, term } = HPHome.loanLimits(P, state, state.price);
  const feeTotal = HPHome.fees(P, state, state.price);
  const need = Math.max(0, state.price + feeTotal - max - state.cash);
  const actualLoan = Math.min(max, Math.max(0, state.price - state.cash));
  const months = term * 12;
  const monthly = HPHome.monthlyPayment(actualLoan, state.rate, months);
  const interest = monthly * months - actualLoan;

  document.getElementById("r-need").innerHTML =
    (need > 0 ? HP.fmtMan(need) : "충분") + (need > 0 ? '<span class="unit"> 원</span>' : "");
  document.getElementById("r-loan").textContent = HP.fmtMan(max);
  document.getElementById("r-loan-sub").textContent =
    `한도 결정: ${bindKey} (LTV ${HP.fmtMan(limits.LTV)} · DSR ${HP.fmtMan(limits.DSR)} · 절대캡 ${
      limits.절대캡 === Infinity ? "없음" : HP.fmtMan(limits.절대캡)})`;
  document.getElementById("r-fees").textContent = HP.fmtMan(feeTotal);
  document.getElementById("r-cash").textContent = HP.fmtMan(state.cash);
  document.getElementById("r-monthly").textContent = HP.fmtManWon(monthly);
  document.getElementById("r-interest").textContent = HP.fmtMan(interest);
  document.getElementById("r-term").textContent = `상환 ${term}년 (만 ${state.age}세 기준)`;

  // 총 필요 자금 = 매매가 + 부대비용
  document.getElementById("r-total-need").textContent = HP.fmtMan(state.price + feeTotal);

  // 도넛
  HP.donut(document.getElementById("donut"), [
    { value: actualLoan, color: "var(--navy)", label: "대출" },
    { value: Math.max(0, state.price - actualLoan), color: "var(--accent)", label: "자기자본" },
  ]);

  // 정책대출
  const loanNeeded = Math.max(0, state.price - state.cash);
  const rows = HPHome.policyRows(P, state, loanNeeded, state.price);
  const eligible = rows.filter((r) => r.eligible && r.loan > 0);
  let best = null;
  for (const r of eligible) if (!best || r.rate < best.rate) best = r;
  document.querySelector("#policy-table tbody").innerHTML = rows.map((r) => {
    const isBest = best && r.name === best.name;
    return `<tr class="${isBest ? "best" : ""}">
      <td>${r.name}${isBest ? ' <span class="badge best">추천</span>' : ""}</td>
      <td>${r.eligible ? "✅" : `<span class="badge na">불가</span><div class="small muted">${r.reason}</div>`}</td>
      <td>${HP.fmtMan(r.limit)}</td>
      <td>${r.rate.toFixed(2)}%${r.rateMax && r.rateMax !== r.rate ? `~${r.rateMax.toFixed(2)}` : ""}</td>
      <td>${r.eligible ? HP.fmtManWon(r.monthly) : "–"}</td></tr>`;
  }).join("");
  document.getElementById("policy-note").textContent = best
    ? `'${best.name}'이(가) 금리 ${best.rate.toFixed(2)}%로 가장 유리합니다.`
    : "조건 충족 정책대출이 없어 일반 주담대 기준입니다.";
}

function syncPriceLabel() {
  document.getElementById("price-val").textContent = HP.fmtMan(state.price);
}
function bindChips(id, key) {
  const box = document.getElementById(id);
  box.querySelectorAll(".chip").forEach((c) => c.onclick = () => {
    box.querySelectorAll(".chip").forEach((x) => x.classList.remove("on"));
    c.classList.add("on"); state[key] = c.dataset.v; render();
  });
}
function bindInputs() {
  const price = document.getElementById("price");
  price.oninput = () => { state.price = +price.value; syncPriceLabel(); render(); };
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

HP.mount("home-goal");
HPPolicy.loadPolicy().then((data) => {
  P = data;
  document.getElementById("policy-date").textContent = data.meta.updated_at;
  syncPriceLabel();
  bindInputs();
  render();
});
