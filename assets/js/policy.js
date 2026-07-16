/* =========================================================
   홈플래닝 — 정책 데이터 로더
   data/policy.json (AI가 매일 갱신) 을 읽어
   계산기와 배너에 최신 정책을 공급한다.
   ========================================================= */

const POLICY_FALLBACK = {
  meta: { updated_at: "2026-07-14", version: "2026.07" },
  headline: "2026년 하반기 정책 기준 적용 중",
  highlights: [],
  ltv: {
    생애최초: { 수도권_비규제: 0.8, 수도권_규제: 0.7, 지방_규제: 0.7, 지방_비규제: 0.8 },
    일반: { 수도권_비규제: 0.7, 수도권_규제: 0.4, 지방_규제: 0.7, 지방_비규제: 0.7 },
  },
  dsr: { 은행: 0.4, "2금융": 0.5 },
  stress_rate: { 수도권: 3.0, 지방: 1.5 },
  loan_abs_cap: {
    수도권: [
      { max_price: 150000, cap: 60000 },
      { max_price: 250000, cap: 40000 },
      { max_price: 999999999, cap: 20000 },
    ],
    지방: [],
  },
  acquisition_tax: { under_6eok: 0.011, over_9eok: 0.033, first_home_max_discount_man: 200 },
  policy_loans: [],
  savings_products: [],
};

async function loadPolicy() {
  const b = window.HP ? HP.basePrefix() : "";
  try {
    const res = await fetch(b + "data/policy.json", { cache: "no-store" });
    if (!res.ok) throw new Error("http " + res.status);
    const data = await res.json();
    window.POLICY = data;
    return data;
  } catch (e) {
    console.warn("[policy] fallback 사용:", e.message);
    window.POLICY = POLICY_FALLBACK;
    return POLICY_FALLBACK;
  }
}

function renderPolicyBanner(el, data) {
  if (!el) return;
  const items = (data.highlights || []).slice(0, 3);
  const list = items
    .map(
      (h) => `
      <div class="policy-item">
        <div class="t">${h.title}</div>
        <div class="s">${h.summary}</div>
        <div class="meta">${h.tag || "정책"} · ${h.date || data.meta.updated_at}${
        h.url ? ` · <a style="color:var(--accent)" href="${h.url}" target="_blank" rel="noopener">기사</a>` : ""
      }</div>
      </div>`
    )
    .join("");
  el.innerHTML = `
    <div class="policy-banner">
      <span class="live"><span class="pulse"></span>AI 매일 갱신</span>
      <div class="headline">${data.headline || "최신 부동산·금융 정책 반영 중"}</div>
      <div class="updated">기준일 ${data.meta.updated_at}</div>
    </div>
    ${items.length ? `<div class="policy-list" style="margin-top:14px">${list}</div>` : ""}`;
}

window.HPPolicy = { loadPolicy, renderPolicyBanner };
