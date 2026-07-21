/* =========================================================
   홈플래닝 — 공통 앱 스크립트
   네비/푸터 주입, 포맷 유틸, 스크롤 애니메이션
   ========================================================= */

const NAV = [
  { label: "내집마련", children: [
    { href: "home-afford", label: "부동산 적정 매매가" },
    { href: "home-goal",   label: "부동산 필요 자금" },
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
          <p style="font-size:14px;color:rgba(255,255,255,.5);margin:0;max-width:280px">
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
};
