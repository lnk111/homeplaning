# 홈플래닝 배포 가이드 (원클릭)

정적 사이트 + GitHub Pages + AI 정책 파이프라인. **명령어 복붙 순서대로** 하면 됩니다.

---

## 0. 사전 준비 (한 번만)

- GitHub 계정 (기존 `lnk111` 사용 가능)
- 도메인 `homeplaning.kr` (이미 보유)
- Git 설치 확인: `git --version`

---

## 1. GitHub 저장소에 올리기

작업 폴더(`C:\Users\72949\Desktop\homeplaning`)에서:

```bash
git init
git add .
git commit -m "feat: 홈플래닝 v2 — 계산기 5종 + AI 정책 파이프라인"
git branch -M main
```

### A) 새 저장소로 (권장)
GitHub에서 빈 저장소 `homeplaning` 생성 후:
```bash
git remote add origin https://github.com/lnk111/homeplaning.git
git push -u origin main
```

### B) 기존 house-money 교체
```bash
git remote add origin https://github.com/lnk111/house-money.git
git push -u origin main --force   # 기존 내용을 새 버전으로 덮어씀 (주의)
```

> `--force`는 기존 저장소를 완전히 대체합니다. 기존 코드를 보존하려면 A안(새 저장소)을 쓰세요.

---

## 2. GitHub Pages 켜기

저장소 → **Settings → Pages**
- **Source**: `Deploy from a branch`
- **Branch**: `main` / `/ (root)` → **Save**
- 잠시 후 `https://<사용자>.github.io/<repo>/` 로 접속 가능

`CNAME` 파일이 이미 포함돼 있어 커스텀 도메인은 자동 인식됩니다.

---

## 3. 커스텀 도메인 연결 (homeplaning.kr)

### 도메인 등록업체 DNS 설정
루트 도메인(`homeplaning.kr`)용 A 레코드 4개 추가:
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```
(선택) `www` 서브도메인은 CNAME → `lnk111.github.io`

### GitHub 쪽
Settings → Pages → **Custom domain** 에 `homeplaning.kr` 입력 → Save
→ DNS 전파(수십 분~수 시간) 후 **Enforce HTTPS** 체크

---

## 4. AI 정책 자동 갱신 켜기 ⭐

매일 새벽 6시(KST) Claude가 정책 뉴스를 파악해 `data/policy.json`을 갱신하고 자동 커밋합니다.

### 4-1. Anthropic API 키 발급
[console.anthropic.com](https://console.anthropic.com) → API Keys → 키 생성 (`sk-ant-...`)

### 4-2. GitHub Secret 등록
저장소 → **Settings → Secrets and variables → Actions → New repository secret**
- Name: `ANTHROPIC_API_KEY`
- Secret: 발급받은 키 붙여넣기

### 4-3. Actions 권한 확인
Settings → Actions → General → **Workflow permissions** →
`Read and write permissions` 선택 → Save (봇이 커밋을 푸시할 수 있어야 함)

### 4-4. 첫 실행 테스트
Actions 탭 → **정책 자동 갱신 (AI)** → **Run workflow** → 수동 실행.
성공하면 `data/policy.json`이 갱신되고 사이트에 즉시 반영됩니다.

> 비용: 하루 1회 웹검색 포함 실행 = 대략 월 수백 원~수천 원 수준(Opus 4.8 기준, 트래픽 무관).

---

## 4.5 견적·문의 자동수집 (Formspree) ⭐

인테리어 견적/상담 폼을 **메일 앱 없이 자동으로 수집**합니다. (미설정 시 자동으로 메일 앱으로 대체되어 동작은 함)

1. [formspree.io](https://formspree.io) 무료 가입 → **New Form** 생성 → 알림 받을 이메일 등록
2. 발급된 엔드포인트 복사 (예: `https://formspree.io/f/abcdwxyz`)
3. `assets/js/config.js` 의 `FORM_ENDPOINT` 값을 그 주소로 교체 후 커밋·푸시

```js
window.HP_CONFIG = {
  FORM_ENDPOINT: "https://formspree.io/f/abcdwxyz",  // ← 여기 교체
  EMAIL: "729497@gmail.com",
  BRAND: "Design For",
};
```

- 제출되면 등록한 이메일로 즉시 알림 + Formspree 대시보드에 리드가 쌓입니다.
- 무료 플랜: 월 50건. 리드가 많아지면 유료 전환.

---

## 5. 검색 등록 & 광고 (수익화 준비)

1. **Google Search Console** → 도메인 등록 → `sitemap.xml` 제출
2. **네이버 서치어드바이저** → 사이트 등록 → 사이트맵 제출
3. **Google AdSense** — 콘텐츠·색인이 어느 정도 쌓인 뒤(1~2주) 신청.
   `privacy.html`에 광고·쿠키 고지가 이미 포함돼 있습니다.
   승인 후 AdSense 스크립트를 각 페이지 `<head>`에 추가하면 광고가 노출됩니다.

---

## 로컬에서 미리보기

```bash
# 방법 1
python -m http.server 8000
# 방법 2
npm run serve
```
→ 브라우저에서 `http://localhost:8000`

> 계산기의 정책 데이터(fetch)는 `file://`에서 안 되므로 반드시 로컬 서버로 여세요.

---

## 폴더 구조

```
homeplaning/
├── index.html                 홈(계산기 허브 + AI 정책 배너)
├── calculators/               계산기 7종
│   ├── home-afford.html (내집찾기: 조건→적정 매매가)
│   ├── home-goal.html   (내집자금: 매매가→필요 자금)
│   ├── interior.html    (인테리어 시공사례 + 무료 견적 폼 → Design For)
│   ├── compound.html (복리)
│   ├── goal.html   (자산목표 역산)
│   ├── salary.html (월급배분)
│   └── savings.html (청년적금·배당)
├── guide/index.html           재테크 자료(SEO 콘텐츠)
├── about/privacy/terms/contact.html
├── data/policy.json           ← AI가 매일 갱신하는 정책 데이터
├── assets/css, assets/js      디자인 시스템 + 계산 로직
├── scripts/update-policy.mjs  AI 갱신 스크립트
└── .github/workflows/update-policy.yml  매일 크론
```
