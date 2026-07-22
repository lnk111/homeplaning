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

/* ---------- 신선도 ----------
   자동 갱신이 멈춰도 화면은 최신인 척하면 안 된다.
   기준일이 며칠 지났는지 계산해 상태를 정직하게 표시한다. */
const STALE_AFTER_DAYS = 3;  // 이 이상 지나면 '지연'
const OLD_AFTER_DAYS = 8;    // 이 이상 지나면 '확인 필요'

function policyAgeDays(data) {
  const raw = data?.meta?.updated_at;
  const t = Date.parse(raw + "T00:00:00Z");
  if (!raw || Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

/** @returns {{level:'fresh'|'stale'|'old'|'unknown', label:string, days:number|null}} */
function policyFreshness(data) {
  const days = policyAgeDays(data);
  if (days === null) return { level: "unknown", label: "기준일 미상", days: null };
  if (days <= STALE_AFTER_DAYS) return { level: "fresh", label: "AI 매일 갱신", days };
  if (days < OLD_AFTER_DAYS) return { level: "stale", label: `갱신 ${days}일 지연`, days };
  return { level: "old", label: `${days}일째 갱신 안 됨`, days };
}

/** 계산기 하단 '정책 기준일' 표시 — 오래됐으면 경고를 함께 노출 */
function renderPolicyDate(el, data) {
  if (!el) return;
  const f = policyFreshness(data);
  el.textContent = data?.meta?.updated_at || "확인 불가";
  if (f.level === "fresh") return;
  const warn = document.createElement("span");
  warn.className = "policy-stale " + f.level;
  warn.textContent = f.level === "unknown" ? " 기준일 미상" : ` ⚠ ${f.label}`;
  el.after(warn);
}

function renderPolicyBanner(el, data) {
  if (!el) return;
  const f = policyFreshness(data);
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
  // 갱신이 밀렸으면 'AI 매일 갱신' 배지 대신 지연 사실을 알린다
  const badge = f.level === "fresh"
    ? `<span class="live"><span class="pulse"></span>${f.label}</span>`
    : `<span class="live stale">⚠ ${f.label}</span>`;
  el.innerHTML = `
    <div class="policy-banner">
      ${badge}
      <div class="headline">${data.headline || "최신 부동산·금융 정책 반영 중"}</div>
      <div class="updated">기준일 ${data.meta.updated_at || "확인 불가"}</div>
    </div>
    ${items.length ? `<div class="policy-list" style="margin-top:14px">${list}</div>` : ""}`;
}

window.HPPolicy = { loadPolicy, renderPolicyBanner, renderPolicyDate, policyFreshness, policyAgeDays };
