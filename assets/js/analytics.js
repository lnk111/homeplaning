/* =========================================================
   홈플래닝 — 방문·전환 측정 (GA4)

   ⚠️ 계산기 URL에는 소득·자산·보증금 값이 들어 있다(계산기 간 값 전달).
      개인정보처리방침 1조는 "계산기 입력값은 서버로 전송되지 않는다"고
      약속하므로, 전송 전에 쿼리 문자열을 반드시 제거한다.

   HP_CONFIG.GA_ID 가 없으면 스크립트 자체를 불러오지 않는다(완전 무동작).
   ========================================================= */

const GA_PLACEHOLDER = /^(|G-XXXXXXXXXX|G-XXXX.*)$/i;

/** 추적 거부 신호를 존중한다 (GPC는 일부 국가에서 법적 구속력이 있다) */
function optedOut() {
  return (
    navigator.globalPrivacyControl === true ||
    navigator.doNotTrack === "1" ||
    window.doNotTrack === "1"
  );
}

function gaId() {
  const id = ((window.HP_CONFIG || {}).GA_ID || "").trim();
  return GA_PLACEHOLDER.test(id) ? "" : id;
}

function isEnabled() {
  return !!gaId() && !optedOut();
}

/** 쿼리·해시를 뺀 경로만 남긴다 — 여기가 개인정보 유출을 막는 지점이다 */
function safeLocation(href) {
  try {
    const u = new URL(href || location.href);
    return u.origin + u.pathname;
  } catch {
    return location.origin + location.pathname;
  }
}

/** 어떤 계산기 페이지인지 (이벤트 분류용) */
function pageKey() {
  const f = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "");
  return f === "" ? "index" : f;
}

let ready = false;

function init() {
  if (!isEnabled()) return;
  const id = gaId();

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", id, {
    // 계산기 입력값이 담긴 쿼리는 절대 보내지 않는다
    page_location: safeLocation(),
    page_referrer: document.referrer ? safeLocation(document.referrer) : undefined,
    anonymize_ip: true,
  });

  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
  ready = true;
}

/**
 * 이벤트 전송. 비활성 상태면 조용히 무시한다.
 * 금액·소득 같은 값은 절대 넘기지 말 것 (분류용 문자열만).
 */
function track(name, params) {
  if (!ready || !window.gtag) return;
  gtag("event", name, { calculator: pageKey(), ...(params || {}) });
}

/* ---------- 자동 계측 ---------- */

/** 계산기를 '실제로 써 본' 시점 — 입력을 처음 바꿨을 때 한 번만 */
function trackFirstUse() {
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    track("calculator_used");
  };
  document.addEventListener("input", fire, { once: false, passive: true });
  document.addEventListener("change", fire, { passive: true });
  // 칩·토글은 click으로만 바뀌는 것이 있다
  document.addEventListener("click", (e) => {
    if (e.target.closest(".chip, .switch")) fire();
  }, { passive: true });
}

/** 링크·버튼 클릭 자동 수집 (data-track 우선, 없으면 알려진 패턴) */
function trackClicks() {
  document.addEventListener("click", (e) => {
    const tagged = e.target.closest("[data-track]");
    if (tagged) {
      track(tagged.dataset.track, { label: tagged.dataset.trackLabel || "" });
      return;
    }
    if (e.target.closest(".share-btn")) {
      track("share_click");
      return;
    }
    // 다음 계산기로 값을 들고 넘어가는 링크 = 연결이 작동하는지 보는 지표
    const next = e.target.closest(".cta-orange, .lead-cta a");
    if (next) {
      const href = next.getAttribute("href") || "";
      track("next_step_click", { to: href.split("?")[0].replace(/\.html$/, "") });
    }
  }, { passive: true });
}

function initAuto() {
  init();
  if (!ready) return;
  trackFirstUse();
  trackClicks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuto);
} else {
  initAuto();
}

window.HPTrack = { track, isEnabled, safeLocation, pageKey, optedOut };
