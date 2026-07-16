/* =========================================================
   홈플래닝 — 리드 폼 전송 헬퍼
   Formspree(설정 시) 자동수집, 미설정 시 메일 앱으로 대체.
   ========================================================= */

function isConfigured() {
  const ep = (window.HP_CONFIG || {}).FORM_ENDPOINT || "";
  return ep && !ep.includes("xxxx");
}

/**
 * 리드 전송.
 * @param {Object} payload  key:value 필드 (한글 라벨 그대로 사용 가능)
 * @param {string} subject  메일 제목/폼 제목
 * @returns {Promise<{ok:boolean, method:string}>}
 */
async function submitLead(payload, subject) {
  const cfg = window.HP_CONFIG || {};
  if (isConfigured()) {
    const res = await fetch(cfg.FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _subject: subject, ...payload }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`폼 전송 실패 (${res.status}) ${t}`);
    }
    return { ok: true, method: "form" };
  }
  // 대체: 메일 앱 열기
  const body = Object.entries(payload)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  window.location.href = `mailto:${cfg.EMAIL || "729497@gmail.com"}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
  return { ok: true, method: "mailto" };
}

/** 폼 자리에 성공 메시지 렌더 */
function renderLeadSuccess(container, opts = {}) {
  container.innerHTML = `
    <div class="card card-pad" style="text-align:center;border-left:3px solid var(--good)">
      <div style="font-size:40px">✅</div>
      <h3 style="color:var(--navy);margin:8px 0">${opts.title || "문의가 접수됐습니다"}</h3>
      <p class="muted" style="margin:0">${opts.msg || "빠른 시일 내에 연락드리겠습니다. 감사합니다."}</p>
    </div>`;
}

window.HPForms = { submitLead, renderLeadSuccess, isConfigured };
