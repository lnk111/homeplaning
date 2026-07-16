/* =========================================================
   홈플래닝 — 공통 앱 스크립트
   네비/푸터 주입, 포맷 유틸, 스크롤 애니메이션
   ========================================================= */

const NAV = [
  { label: "내집마련", children: [
    { href: "home-afford", label: "내집찾기 · 종잣돈 → 집값" },
    { href: "home-goal",   label: "내집자금 · 집값 → 필요돈" },
  ]},
  { href: "interior", label: "인테리어" },
  { href: "compound", label: "복리" },
  { href: "goal",     label: "자산목표" },
  { href: "salary",   label: "월급배분" },
  { href: "savings",  label: "적금·배당" },
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
          <p style="font-size:14px;color:#aeb7cc;margin:0;max-width:280px">
            2030 사회초년생의 첫 돈 관리·자산형성·내집마련을 돕는 무료 계산기 플랫폼.
          </p>
        </div>
        <div>
          <h4>계산기</h4>
          <a href="${b}calculators/home-afford.html">내집찾기 계산기</a>
          <a href="${b}calculators/home-goal.html">내집자금 계산기</a>
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
        <br>운영: Design For · 문의 <a style="display:inline;color:#aeb7cc;text-decoration:underline" href="${b}contact.html">여기</a>
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
  mount, fmtMan, fmtWon, fmtManWon, fmtPct, clamp,
  donut, growthBars, linkFor, basePrefix,
};
