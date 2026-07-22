/* =========================================================
   홈플래닝 — 공통 앱 스크립트
   네비/푸터 주입, 포맷 유틸, 스크롤 애니메이션
   ========================================================= */

/* 사회초년생이 실제로 겪는 순서대로 배치한다.
   첫 월급 배분 → 목표 설정 → 모으는 수단 → 집 → 인테리어 → 참고 자료 */
const NAV = [
  { href: "salary",   label: "월급배분" },
  { href: "goal",     label: "자산목표" },
  { href: "savings",  label: "적금·배당" },
  { href: "compound", label: "복리" },
  { label: "내집마련", children: [
    { href: "home-afford", label: "부동산 적정 매매가" },
    { href: "home-goal",   label: "부동산 필요 자금" },
    { href: "jeonse",      label: "전세 보증금" },
  ]},
  { href: "interior", label: "인테리어" },
  { href: "guide",    label: "재테크자료" },
];

/* 현재 페이지 위치에 따라 상대 경로 접두사 계산 */
function basePrefix() {
  // /calculators/xxx.html 이면 ../ , 루트면 ''
  const p = location.pathname.replace(/\\/g, "/");
  return /\/calculators\//.test(p) || /\/guide\//.test(p) ? "../" : "";
}

function linkFor(key) {
  const b = basePrefix();
  if (key === "guide") return b + "guide/index.html";
  return b + "calculators/" + key + ".html";
}

function renderHeader(active) {
  const b = basePrefix();
  const pills = NAV.map((n) => {
    if (n.children) {
      const inGroup = n.children.some((c) => c.href === active);
      const links = n.children.map(
        (c) => `<a href="${linkFor(c.href)}" ${c.href === active ? 'class="active"' : ""}>${c.label}</a>`
      ).join("");
      return `<div class="nav-dd">
        <button type="button" class="dd-btn ${inGroup ? "active" : ""}">${n.label}<span class="dd-caret">▾</span></button>
        <div class="dd-menu">${links}</div>
      </div>`;
    }
    return `<a href="${linkFor(n.href)}" ${n.href === active ? 'class="active"' : ""}>${n.label}</a>`;
  }).join("");
  return `
  <header class="site-header">
    <div class="wrap nav">
      <a class="brand" href="${b}index.html"><span class="dot"></span>홈플래닝</a>
      <nav class="nav-pills">${pills}</nav>
    </div>
  </header>`;
}

function renderFooter() {
  const b = basePrefix();
  return `
  <footer class="site-footer">
    <div class="wrap">
      <div class="cols">
        <div>
          <div class="brand">홈플래닝</div>
          <p style="font-size:14px;color:rgba(255,255,255,.5);margin:0;max-width:280px">
            2030 사회초년생의 첫 돈 관리·자산형성·내집마련을 돕는 무료 계산기 플랫폼.
          </p>
        </div>
        <div>
          <h4>계산기</h4>
          <a href="${b}calculators/home-afford.html">내집찾기 계산기</a>
          <a href="${b}calculators/home-goal.html">내집자금 계산기</a>
          <a href="${b}calculators/jeonse.html">전세 계산기</a>
          <a href="${b}calculators/interior.html">인테리어 견적</a>
          <a href="${b}calculators/compound.html">복리 계산기</a>
          <a href="${b}calculators/goal.html">자산목표 계산기</a>
          <a href="${b}calculators/salary.html">월급배분 계산기</a>
          <a href="${b}calculators/savings.html">적금·배당 계산기</a>
        </div>
        <div>
          <h4>정보</h4>
          <a href="${b}guide/index.html">재테크 자료</a>
          <a href="${b}about.html">사이트 소개</a>
          <a href="${b}privacy.html">개인정보처리방침</a>
          <a href="${b}terms.html">이용약관</a>
          <a href="${b}contact.html">문의·제휴</a>
        </div>
      </div>
      <div class="disc">
        홈플래닝의 모든 계산 결과는 <strong>참고용 추정치</strong>이며, 실제 대출 한도·금리·세금은 개인 신용,
        금융기관 심사, 시장 상황에 따라 달라질 수 있습니다. 투자·대출 결정 전 반드시 전문가와 상담하세요.
        <br>운영: 디자인포 · 문의 <a style="display:inline;color:rgba(255,255,255,.5);text-decoration:underline" href="${b}contact.html">여기</a>
        · © 2026 홈플래닝(homeplaning.kr)
      </div>
    </div>
  </footer>`;
}

/* 페이지에서 호출: HP.mount('home') */
function mount(active) {
  const h = document.getElementById("app-header");
  const f = document.getElementById("app-footer");
  if (h) h.outerHTML = renderHeader(active);
  if (f) f.outerHTML = renderFooter();
  initDropdowns();
  initReveal();
  initAmountHints();
  initAdvanced();
  scrollActiveTabIntoView();
  initMiniResult();
}

/* ---------- 세부 설정 접기 ----------
   입력칸이 11~12개면 처음 온 사람은 시작도 하기 전에 지친다.
   자주 안 바꾸는 항목은 접어 두되, 값이 바뀌면 '변경됨'을 표시해
   숨겨진 설정이 결과에 영향을 준다는 사실을 감추지 않는다. */
const advPanels = [];

function initAdvanced(root) {
  (root || document).querySelectorAll(".adv").forEach((adv) => {
    const body = adv.querySelector(".adv-body");
    const btn = adv.querySelector(".adv-toggle");
    if (!body || !btn) return;

    const snapshot = () => [
      ...[...body.querySelectorAll("input, select")].map((f) => (f.type === "checkbox" ? f.checked : f.value)),
      ...[...body.querySelectorAll(".chip")].map((c) => c.classList.contains("on")),
    ].join("|");
    const initial = snapshot();
    const mark = adv.querySelector(".adv-mark");

    const setOpen = (open) => {
      body.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      adv.classList.toggle("open", open);
    };
    const refresh = () => {
      if (mark) mark.hidden = snapshot() === initial;
    };

    btn.addEventListener("click", () => setOpen(body.hidden));
    body.addEventListener("input", refresh);
    body.addEventListener("change", refresh);
    body.addEventListener("click", (e) => { if (e.target.closest(".chip")) setTimeout(refresh, 0); });

    setOpen(false);
    refresh();
    // 계산기가 링크 값을 반영한 뒤 다시 부를 수 있게 등록해 둔다
    advPanels.push({ snapshot, initial, setOpen, refresh });
  });
}

/** 링크로 넘어온 값이 접힌 영역에 있으면 펼친다.
    숨겨진 채로 결과만 달라지면 사용자가 이유를 알 수 없다. */
function refreshAdvanced() {
  advPanels.forEach((p) => {
    if (p.snapshot() !== p.initial) p.setOpen(true);
    p.refresh();
  });
}

/* ---------- 모바일 고정 결과 바 ----------
   모바일은 입력칸이 위, 결과가 아래로 쌓인다. 계산기에 따라 결과까지
   1,100~1,400px를 내려야 해서, 값을 바꿔도 답이 화면 밖에 있다.
   = 계산기의 핵심 동작(바꾸면 바로 보인다)이 끊긴다.
   결과 히어로를 화면 하단에 거울처럼 띄워 항상 보이게 한다. */
const MINI_BREAKPOINT = "(max-width: 860px)"; // 레이아웃이 1단으로 접히는 지점

function initMiniResult() {
  // 탭이 있는 계산기(적금·배당)는 결과 영역이 여러 개다.
  // 첫 번째를 붙잡으면 탭을 바꿔도 숨겨진 패널의 숫자를 계속 보여준다.
  const heroes = [...document.querySelectorAll(".result-hero")].filter((h) => h.querySelector(".big"));
  if (!heroes.length) return;
  const current = () => heroes.find((h) => h.offsetParent !== null) || heroes[0];

  const bar = document.createElement("button");
  bar.type = "button";
  bar.className = "mini-result";
  bar.setAttribute("aria-label", "계산 결과로 이동");
  bar.innerHTML = '<span class="mr-t"><span class="mr-k"></span><span class="mr-v"></span></span><span class="mr-go">결과 보기 ↓</span>';
  document.body.appendChild(bar);

  // 보이는 결과 영역만 따라간다. 값·위치·표시여부를 한 번에 갱신.
  const apply = () => {
    const hero = current();
    const label = hero.querySelector(".label");
    const big = hero.querySelector(".big");
    bar.querySelector(".mr-k").textContent = label ? label.textContent.trim() : "계산 결과";
    bar.querySelector(".mr-v").textContent = big.textContent.replace(/\s+/g, " ").trim();

    const r = hero.getBoundingClientRect();
    const heroVisible = r.top < window.innerHeight * 0.9 && r.bottom > 0;
    const show = !heroVisible && window.matchMedia(MINI_BREAKPOINT).matches;
    bar.classList.toggle("on", show);
    document.body.classList.toggle("has-mini", show);
  };

  // 입력이 바뀌면 히어로가 다시 그려지므로 그 변화를 그대로 따라간다
  heroes.forEach((h) => new MutationObserver(apply)
    .observe(h, { subtree: true, childList: true, characterData: true }));

  bar.addEventListener("click", () => current().scrollIntoView({ behavior: "smooth", block: "center" }));

  // rect 읽기 한 번뿐이라 스로틀 없이도 가볍다. 단순한 편이 더 안전하다.
  window.addEventListener("scroll", apply, { passive: true });
  window.addEventListener("resize", apply, { passive: true });
  // 탭 전환은 클릭으로 일어난다 — 보이는 패널이 바뀌면 바도 따라가야 한다
  document.addEventListener("click", () => setTimeout(apply, 0), { passive: true });
  apply();
}

/* 모바일에서 탭 줄이 가로 스크롤되면 현재 탭이 화면 밖에 있을 수 있다 */
function scrollActiveTabIntoView() {
  const nav = document.querySelector(".nav-pills");
  if (!nav || nav.scrollWidth <= nav.clientWidth) return;
  const tab = nav.querySelector(".active")?.closest(".nav-dd, a");
  if (!tab) return;
  // offsetLeft는 헤더 기준이라 쓸 수 없다. 화면 좌표 차이로 스크롤 영역 내 위치를 구한다
  const navBox = nav.getBoundingClientRect();
  const tabBox = tab.getBoundingClientRect();
  const posInNav = nav.scrollLeft + (tabBox.left - navBox.left);
  const centered = posInNav - (nav.clientWidth - tabBox.width) / 2;
  nav.scrollLeft = Math.max(0, Math.min(centered, nav.scrollWidth - nav.clientWidth));
}

/* =========================================================
   계산기 간 값 전달 · 결과 공유
   서버도 로그인도 없이 URL 쿼리로 값을 넘긴다.
   같은 링크를 열면 누구든 같은 결과를 본다 = 공유 기능이 덤으로 따라온다.
   ========================================================= */

const CALC_LABEL = {
  salary: "월급배분", goal: "자산목표", savings: "적금·배당", compound: "복리",
  "home-afford": "내집찾기", "home-goal": "내집자금", jeonse: "전세",
};

/**
 * URL 쿼리에서 값을 읽는다. 외부 입력이므로 타입과 범위를 반드시 검증한다.
 * @param {Object} spec { key: {min,max} | {allow:[...]} }
 * @returns {Object} 검증을 통과한 값만 담긴 객체
 */
function readParams(spec) {
  const q = new URLSearchParams(location.search);
  const out = {};
  for (const [key, def] of Object.entries(spec)) {
    if (!q.has(key)) continue;
    const raw = (q.get(key) || "").trim();
    if (def.allow) {
      if (def.allow.includes(raw)) out[key] = raw;
      continue;
    }
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n)) continue; // 빈값·NaN·Infinity 차단
    out[key] = Math.min(def.max ?? Infinity, Math.max(def.min ?? 0, n));
  }
  return out;
}

/** 상대 링크에 값을 붙인다. 빈 값은 넣지 않는다. */
function withParams(href, params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "" || (typeof v === "number" && !Number.isFinite(v))) continue;
    q.set(k, typeof v === "number" ? String(Math.round(v * 100) / 100) : String(v));
  }
  const s = q.toString();
  return s ? `${href}?${s}` : href;
}

/** 마지막 글자에 받침이 있는지. 한글이 아니면 null. */
function hasBatchim(word) {
  const code = (word || "").charCodeAt((word || "").length - 1);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return null;
  return (code - 0xac00) % 28;
}

/** 받침에 따라 '로/으로'를 고른다. 받침이 없거나 ㄹ이면 '로'.
    (월급배분 → 으로, 자산목표 → 로) */
function josaRo(word) {
  const jong = hasBatchim(word);
  if (jong === null) return "로";
  return jong === 0 || jong === 8 ? "로" : "으로"; // 8 = ㄹ
}

/** 은/는, 이/가, 을/를 등 받침 유무로 갈리는 조사.
    josa("청년도약계좌", "은", "는") → "는" */
function josa(word, withB, withoutB) {
  const jong = hasBatchim(word);
  if (jong === null) return withoutB;
  return jong === 0 ? withoutB : withB;
}

/** 지금 보고 있는 계산기 키 (파일명 기준) */
function currentCalcKey() {
  return (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
}

/** 어느 계산기에서 넘어왔는지 (from 파라미터).
    공유 링크는 from이 자기 자신이므로, 그때는 이어받음이 아니다. */
function handoffSource() {
  const f = new URLSearchParams(location.search).get("from");
  if (!CALC_LABEL[f] || f === currentCalcKey()) return null;
  return { key: f, label: CALC_LABEL[f] };
}

/**
 * 이어받은 값을 화면에 알린다.
 * 값이 기본값과 다른 이유를 모르면 사용자는 계산기를 믿지 못한다.
 * @param {Element} el 결과 영역 (맨 위에 삽입)
 * @param {Array<{k:string,v:string}>} items 이어받은 항목
 */
function handoffNotice(el, items) {
  const src = handoffSource();
  if (!el || !src || !items || !items.length) return;
  const list = items.map((i) => `${i.k} <b>${i.v}</b>`).join(" · ");
  const back = document.createElement("div");
  back.className = "handoff";
  back.innerHTML = `<span class="ic">↩</span>
    <div><b>${src.label} 계산기</b>에서 이어받았어요 — ${list}
    <a href="${linkFor(src.key)}">${src.label}${josaRo(src.label)} 돌아가기</a></div>`;
  el.prepend(back);
}

/** 현재 값이 담긴 공유용 절대 URL */
function shareUrl(params) {
  const rel = withParams(location.pathname.split("/").pop() || "", params);
  const q = rel.includes("?") ? rel.slice(rel.indexOf("?")) : "";
  return location.origin + location.pathname + q;
}

/**
 * 공유 버튼을 붙인다. 누르면 현재 값이 담긴 링크가 복사된다.
 * @param {Element} el 버튼을 넣을 컨테이너
 * @param {Function} getParams 현재 상태를 파라미터 객체로 반환
 */
function initShare(el, getParams) {
  if (!el) return;
  el.innerHTML = `<button type="button" class="btn btn-ghost share-btn">🔗 결과 링크 복사</button>
    <input class="share-url" type="text" readonly hidden aria-label="공유 링크">`;
  const btn = el.querySelector(".share-btn");
  const box = el.querySelector(".share-url");
  btn.addEventListener("click", async () => {
    const url = shareUrl(getParams());
    try {
      await navigator.clipboard.writeText(url);
      btn.textContent = "✅ 복사됐어요";
      btn.classList.add("ok");
      setTimeout(() => { btn.textContent = "🔗 결과 링크 복사"; btn.classList.remove("ok"); }, 2000);
    } catch {
      // 클립보드 권한이 없으면 직접 복사할 수 있게 노출한다
      box.value = url;
      box.hidden = false;
      box.select();
      btn.textContent = "아래 주소를 복사하세요";
    }
  });
}

/* ---------- 금액 입력 하단에 억/만원 환산 표기 ----------
   '만원' 접미사를 가진 숫자 입력을 찾아 아래에 읽기 쉬운 금액을 보여준다.
   예) 10000 → "1억원", 15000 → "1억 5,000만원"                       */
const amountHintUpdaters = [];
function initAmountHints(root) {
  (root || document).querySelectorAll(".input-suffix").forEach((wrap) => {
    const suffix = wrap.querySelector(".suffix");
    const input = wrap.querySelector('input[type="number"]');
    if (!suffix || !input) return;
    const sfx = suffix.textContent.trim();
    if (sfx.indexOf("만원") !== 0) return; // '만원', '만원/년'만 대상
    if (wrap.parentNode && wrap.parentNode.classList.contains("amt-field")) return; // 중복 방지

    // 그리드/플렉스 부모의 칸을 유지하도록 입력+힌트를 래퍼로 감싼다
    const holder = document.createElement("div");
    holder.className = "amt-field";
    wrap.parentNode.insertBefore(holder, wrap);
    holder.appendChild(wrap);

    const tail = sfx.slice(2); // '/년' 같은 꼬리표 유지
    const hint = document.createElement("div");
    hint.className = "amt-hint";
    holder.appendChild(hint);

    const update = () => {
      const v = +input.value;
      hint.textContent = v > 0 ? fmtMan(v) + "원" + tail : "";
    };
    input.addEventListener("input", update);
    amountHintUpdaters.push(update);
    update();
  });
}
/* 값을 JS로 바꾼 뒤(예: 월급배분 자동 배분) 호출 */
function refreshAmountHints() {
  amountHintUpdaters.forEach((f) => f());
}

/* 내집마련 드롭다운 (position:fixed 로 스크롤 컨테이너 클리핑 회피) */
function closeAllMenus() {
  document.querySelectorAll(".dd-menu.open").forEach((m) => m.classList.remove("open"));
}
function initDropdowns() {
  document.querySelectorAll(".nav-dd").forEach((dd) => {
    const btn = dd.querySelector(".dd-btn");
    const menu = dd.querySelector(".dd-menu");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains("open");
      closeAllMenus();
      if (!isOpen) {
        const r = btn.getBoundingClientRect();
        menu.style.top = r.bottom + 6 + "px";
        menu.style.left = Math.max(8, r.left) + "px";
        menu.classList.add("open");
      }
    });
  });
  document.addEventListener("click", closeAllMenus);
  window.addEventListener("scroll", closeAllMenus, true);
  window.addEventListener("resize", closeAllMenus);
}

/* ---------- 숫자 포맷 유틸 ---------- */
/* 내부 계산 단위: '만원'. 표시할 때 억/만원 변환 */
function fmtMan(man) {
  man = Math.round(man);
  if (Math.abs(man) >= 10000) {
    const eok = Math.floor(Math.abs(man) / 10000);
    const rest = Math.abs(man) % 10000;
    const sign = man < 0 ? "-" : "";
    return rest === 0
      ? `${sign}${eok.toLocaleString()}억`
      : `${sign}${eok.toLocaleString()}억 ${rest.toLocaleString()}만`;
  }
  return `${man.toLocaleString()}만`;
}
/* 차트 축처럼 폭이 좁은 자리용 짧은 표기: 15000 → "1.5억", 3000 → "3,000만"
   fmtMan은 "1억 5,000만"이라 축 라벨로 쓰면 그래프 밖으로 잘린다 */
function fmtManShort(man) {
  man = Math.round(man);
  if (Math.abs(man) >= 10000) {
    const eok = man / 10000;
    return (Math.abs(man) % 10000 === 0 ? eok : eok.toFixed(1)) + "억";
  }
  return man.toLocaleString() + "만";
}
function fmtWon(won) {
  return Math.round(won).toLocaleString() + "원";
}
function fmtManWon(man) {
  // 만원 단위 값을 '원'까지 콤마
  return (Math.round(man) * 10000).toLocaleString() + "원";
}
function fmtPct(x, d = 1) {
  return x.toFixed(d) + "%";
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

/* ---------- 도넛 차트 (SVG) ---------- */
function donut(el, parts) {
  // parts: [{value, color, label}]
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
  const R = 54, C = 2 * Math.PI * R;
  let off = 0;
  const rings = parts
    .map((p) => {
      const frac = Math.max(0, p.value) / total;
      const len = frac * C;
      const seg = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${p.color}"
        stroke-width="22" stroke-dasharray="${len} ${C - len}"
        stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;
      off += len;
      return seg;
    })
    .join("");
  const legend = parts
    .map(
      (p) =>
        `<div class="li"><span class="sw" style="background:${p.color}"></span>${p.label} ${Math.round(
          (Math.max(0, p.value) / total) * 100
        )}%</div>`
    )
    .join("");
  el.innerHTML = `
    <svg viewBox="0 0 140 140" width="150" height="150" style="margin:0 auto;display:block">${rings}</svg>
    <div class="legend" style="justify-content:center">${legend}</div>`;
}

/* ---------- 도넛 패널 (가운데 라벨 + 측면 금액 범례) ---------- */
function donutPanel(el, parts, opts = {}) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
  const R = 55, C = 2 * Math.PI * R;
  let off = 0;
  const rings = parts
    .map((p) => {
      const len = (Math.max(0, p.value) / total) * C;
      const seg = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${p.color}"
        stroke-width="19" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"
        transform="rotate(-90 70 70)"/>`;
      off += len;
      return seg;
    })
    .join("");
  const center = opts.centerLabel
    ? `<div class="dp-center">
        <div class="dp-center-v"${opts.centerColor ? ` style="color:${opts.centerColor}"` : ""}>${opts.centerLabel}</div>
        <div class="dp-center-s">${opts.centerSub || ""}</div>
      </div>`
    : "";
  const legend = parts
    .map(
      (p) => `<div class="dp-row">
        <span class="dp-dot" style="background:${p.color}"></span>
        <span class="dp-label">${p.label}</span>
        <span class="dp-amt">${p.display}</span>
      </div>`
    )
    .join("");
  el.innerHTML = `
    <div class="dp-wrap">
      <div class="dp-chart">
        <svg viewBox="0 0 140 140" width="150" height="150">${rings}</svg>${center}
      </div>
      <div class="dp-legend">${legend}</div>
    </div>`;
}

/* ---------- 막대 성장 차트 (SVG) ---------- */
function growthBars(el, series, opts = {}) {
  // series: [{label, value}] value in 만원
  const max = Math.max(...series.map((s) => s.value), 1);
  const W = 100 / series.length;
  const bars = series
    .map((s, i) => {
      const h = (s.value / max) * 100;
      const color = opts.color || "var(--accent)";
      return `
      <g>
        <rect x="${i * W + W * 0.18}%" y="${100 - h}%" width="${W * 0.64}%" height="${h}%"
          rx="3" fill="${color}" opacity="${0.5 + 0.5 * (i / (series.length - 1 || 1))}"/>
      </g>`;
    })
    .join("");
  const labels = series
    .map((s, i) => `<span style="flex:1;text-align:center">${s.label}</span>`)
    .join("");
  el.innerHTML = `
    <div style="position:relative;height:160px;background:var(--surface-2);border-radius:10px;padding:8px">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">${bars}</svg>
    </div>
    <div style="display:flex;font-size:11px;color:var(--text-3);margin-top:6px">${labels}</div>`;
}

/* ---------- 누적(스택) 막대 차트 (SVG) ---------- */
function stackedBars(el, series, opts = {}) {
  // series: [{label, parts:[{value, color}]}] — parts는 아래에서 위로 쌓임(원금→수익)
  const totals = series.map((s) => s.parts.reduce((a, p) => a + Math.max(0, p.value), 0));
  const max = Math.max(...totals, 1);
  const W = 100 / series.length;
  const bars = series
    .map((s, i) => {
      let acc = 0; // 바닥부터 누적 높이(%)
      const last = s.parts.length - 1;
      return s.parts
        .map((p, j) => {
          const h = (Math.max(0, p.value) / max) * 100;
          const y = 100 - acc - h;
          acc += h;
          // 맨 위 조각만 위쪽 모서리 둥글게
          const rx = j === last ? 'rx="3"' : "";
          return `<rect x="${i * W + W * 0.18}%" y="${y}%" width="${W * 0.64}%" height="${h}%" ${rx} fill="${p.color}"/>`;
        })
        .join("");
    })
    .join("");
  const labels = series
    .map((s) => `<span style="flex:1;text-align:center">${s.label}</span>`)
    .join("");
  const legend = (opts.legend || [])
    .map((l) => `<div class="li"><span class="sw" style="background:${l.color}"></span>${l.label}</div>`)
    .join("");
  el.innerHTML = `
    <div style="position:relative;height:160px;background:var(--surface-2);border-radius:10px;padding:8px">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">${bars}</svg>
    </div>
    <div style="display:flex;font-size:11px;color:var(--text-3);margin-top:6px">${labels}</div>
    ${legend ? `<div class="legend" style="justify-content:center;margin-top:8px">${legend}</div>` : ""}`;
}

/* ---------- 라인 차트 (호버 툴팁: N년 후 납입원금·총자산) ---------- */
function niceCeil(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  return (steps.find((s) => n <= s) || 10) * p;
}
function lineChart(el, opts) {
  const pts = opts.points; // [{year, base, total}]
  const N = pts[pts.length - 1].year || 1;
  const fmt = opts.fmt || ((v) => Math.round(v));
  const axisFmt = opts.axisFmt || fmt;
  const cBase = opts.baseColor || "rgba(0,0,0,.38)";
  const cTotal = opts.totalColor || "var(--accent)";
  const W = 560, H = 280, padL = 54, padR = 14, padT = 14, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const x0 = padL, yBottom = padT + plotH;
  const yMax = niceCeil(Math.max(...pts.map((p) => p.total), 1) * 1.08);
  const X = (yr) => x0 + (yr / N) * plotW;
  const Y = (v) => yBottom - (v / yMax) * plotH;

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const t = f * yMax, y = Y(t);
      return `<line x1="${x0}" y1="${y}" x2="${x0 + plotW}" y2="${y}" stroke="var(--line)"/>
        <text x="${x0 - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="var(--text-3)">${axisFmt(t)}</text>`;
    })
    .join("");
  const xstep = N <= 12 ? 1 : Math.ceil(N / 10);
  let xlabels = "";
  for (let yr = 0; yr <= N + 0.001; yr += xstep)
    xlabels += `<text x="${X(Math.min(yr, N))}" y="${yBottom + 18}" text-anchor="middle" font-size="12" fill="var(--text-3)">${Math.round(yr)}년</text>`;

  const line = (k) => pts.map((p, i) => `${i ? "L" : "M"}${X(p.year).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(" ");
  const area = (k) => `M${X(0)},${yBottom} ` + pts.map((p) => `L${X(p.year).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(" ") + ` L${X(N)},${yBottom} Z`;

  el.innerHTML = `
    <div class="lc-container" style="position:relative">
      <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">
        ${grid}${xlabels}
        <path d="${area("total")}" fill="${cTotal}" opacity="0.09"/>
        ${opts.baseDashed ? "" : `<path d="${area("base")}" fill="${cBase}" opacity="0.10"/>`}
        <path d="${line("base")}" fill="none" stroke="${cBase}" stroke-width="2.5"${opts.baseDashed ? ' stroke-dasharray="6 5"' : ""}/>
        <path d="${line("total")}" fill="none" stroke="${cTotal}" stroke-width="2.5"/>
        <g class="lc-hover" style="display:none">
          <line class="lc-vline" y1="${padT}" y2="${yBottom}" stroke="var(--text-3)" stroke-dasharray="3 3"/>
          <circle class="lc-dot-b" r="5" fill="${cBase}" stroke="#fff" stroke-width="2"/>
          <circle class="lc-dot-t" r="5" fill="${cTotal}" stroke="#fff" stroke-width="2"/>
        </g>
      </svg>
      <div class="lc-legend"><span><span class="lc-dot" style="background:${cBase}"></span>납입 원금</span><span><span class="lc-dot" style="background:${cTotal}"></span>총 자산</span></div>
      <div class="lc-tip" style="display:none"></div>
    </div>`;

  const cont = el.querySelector(".lc-container");
  const svg = el.querySelector("svg");
  const hov = el.querySelector(".lc-hover");
  const vline = el.querySelector(".lc-vline");
  const dotB = el.querySelector(".lc-dot-b");
  const dotT = el.querySelector(".lc-dot-t");
  const tip = el.querySelector(".lc-tip");

  function showAt(clientX) {
    const rect = svg.getBoundingClientRect();
    const vbX = ((clientX - rect.left) / rect.width) * W;
    let bi = 0, bd = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(X(p.year) - vbX); if (d < bd) { bd = d; bi = i; } });
    const p = pts[bi], px = X(p.year);
    vline.setAttribute("x1", px); vline.setAttribute("x2", px);
    dotB.setAttribute("cx", px); dotB.setAttribute("cy", Y(p.base));
    dotT.setAttribute("cx", px); dotT.setAttribute("cy", Y(p.total));
    hov.style.display = "";
    tip.innerHTML = `<div class="lc-tip-yr">${Math.round(p.year)}년 후</div>
      <div class="lc-tip-row"><span><span class="lc-dot" style="background:${cBase}"></span>납입 원금</span><b>${fmt(p.base)}</b></div>
      <div class="lc-tip-row"><span><span class="lc-dot" style="background:${cTotal}"></span>총 자산</span><b>${fmt(p.total)}</b></div>`;
    tip.style.display = "block";
    const leftPx = (px / W) * rect.width, tw = tip.offsetWidth || 160;
    let L = leftPx + 14;
    if (L + tw > cont.clientWidth) L = leftPx - tw - 14;
    tip.style.left = Math.max(2, L) + "px";
  }
  function hide() { hov.style.display = "none"; tip.style.display = "none"; }
  cont.addEventListener("mousemove", (e) => showAt(e.clientX));
  cont.addEventListener("mouseleave", hide);
  cont.addEventListener("touchstart", (e) => e.touches[0] && showAt(e.touches[0].clientX), { passive: true });
  cont.addEventListener("touchmove", (e) => e.touches[0] && showAt(e.touches[0].clientX), { passive: true });
}

/* ---------- 시나리오 막대 차트 (현재 위치 강조 + 호버 툴팁) ---------- */
function scenarioBars(el, opts) {
  // items: [{label, value, current, tipTitle, tip:[{k,v}]}] — value 만원
  const items = opts.items || [];
  if (!items.length) { el.innerHTML = ""; return; }
  const axisFmt = opts.axisFmt || ((v) => Math.round(v));
  const cOn = opts.activeColor || "var(--accent)";
  const cOff = opts.barColor || "rgba(0,0,0,.12)";
  // 좁은 화면에서는 뷰박스를 줄여 글자가 상대적으로 커지도록 함
  const narrow = (el.clientWidth || 560) < 430;
  const W = narrow ? 400 : 560, H = narrow ? 240 : 250;
  const padL = narrow ? 40 : 56, padR = 10, padT = 18, padB = narrow ? 30 : 46;
  const showSub = !narrow;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const x0 = padL, yBottom = padT + plotH;
  const yMax = niceCeil(Math.max(...items.map((i) => i.value), 1) * 1.1);
  const slot = plotW / items.length;
  const bw = Math.min(44, slot * 0.52);
  const cx = (i) => x0 + slot * (i + 0.5);
  const Y = (v) => yBottom - (v / yMax) * plotH;

  const grid = (narrow ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1])
    .map((f) => {
      const t = f * yMax, y = Y(t);
      return `<line x1="${x0}" y1="${y}" x2="${x0 + plotW}" y2="${y}" stroke="var(--line)"/>
        <text x="${x0 - 6}" y="${y + 4}" text-anchor="end" font-size="12" fill="var(--text-3)">${axisFmt(t)}</text>`;
    })
    .join("");

  const bars = items
    .map((it, i) => {
      const h = Math.max(3, yBottom - Y(it.value));
      return `<rect class="sb-bar" data-i="${i}" x="${(cx(i) - bw / 2).toFixed(1)}" y="${Y(it.value).toFixed(1)}"
        width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="${it.current ? cOn : cOff}"/>`;
    })
    .join("");

  const xlabels = items
    .map(
      (it, i) =>
        `<text x="${cx(i).toFixed(1)}" y="${yBottom + 19}" text-anchor="middle" font-size="12"
          fill="${it.current ? "var(--accent)" : "var(--text-3)"}" font-weight="${it.current ? 800 : 500}">${it.label}</text>` +
        (it.sub && showSub
          ? `<text x="${cx(i).toFixed(1)}" y="${yBottom + 35}" text-anchor="middle" font-size="11" fill="${
              it.current ? "var(--accent)" : "var(--text-3)"
            }" font-weight="${it.current ? 700 : 400}">${it.sub}</text>`
          : "")
    )
    .join("");

  el.innerHTML = `
    <div class="lc-container" style="position:relative">
      <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">${grid}${bars}${xlabels}</svg>
      <div class="lc-tip" style="display:none"></div>
    </div>`;

  const cont = el.querySelector(".lc-container");
  const svg = el.querySelector("svg");
  const tip = el.querySelector(".lc-tip");
  const rects = Array.from(el.querySelectorAll(".sb-bar"));

  function showAt(clientX) {
    const rect = svg.getBoundingClientRect();
    const vbX = ((clientX - rect.left) / rect.width) * W;
    let bi = 0, bd = Infinity;
    items.forEach((it, i) => { const d = Math.abs(cx(i) - vbX); if (d < bd) { bd = d; bi = i; } });
    const it = items[bi];
    rects.forEach((r, i) => r.setAttribute("opacity", i === bi ? "1" : "0.45"));
    tip.innerHTML =
      `<div class="lc-tip-yr">${it.tipTitle || it.label}</div>` +
      (it.tip || []).map((t) => `<div class="lc-tip-row"><span>${t.k}</span><b>${t.v}</b></div>`).join("");
    tip.style.display = "block";
    const scale = rect.width / W;
    const tw = tip.offsetWidth || 170;
    let L = cx(bi) * scale - tw / 2;
    L = Math.max(2, Math.min(L, cont.clientWidth - tw - 2));
    tip.style.left = L + "px";
    tip.style.top = Math.max(2, Y(it.value) * (rect.height / H) - tip.offsetHeight - 10) + "px";
  }
  function hide() {
    tip.style.display = "none";
    rects.forEach((r) => r.setAttribute("opacity", "1"));
  }
  cont.addEventListener("mousemove", (e) => showAt(e.clientX));
  cont.addEventListener("mouseleave", hide);
  cont.addEventListener("touchstart", (e) => e.touches[0] && showAt(e.touches[0].clientX), { passive: true });
  cont.addEventListener("touchmove", (e) => e.touches[0] && showAt(e.touches[0].clientX), { passive: true });
}

/* ---------- 스크롤 리빌 ---------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || !els.length) {
    els.forEach((e) => e.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  els.forEach((e) => io.observe(e));
}

window.HP = {
  mount, fmtMan, fmtManShort, fmtWon, fmtManWon, fmtPct, clamp,
  donut, donutPanel, growthBars, stackedBars, lineChart, scenarioBars, linkFor, basePrefix,
  initAmountHints, refreshAmountHints,
  readParams, withParams, handoffNotice, handoffSource, shareUrl, initShare,
  initAdvanced, refreshAdvanced, josa, josaRo,
};
