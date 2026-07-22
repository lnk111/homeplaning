/* =========================================================
   홈플래닝 — 사이트 설정
   ⚠️ 배포 전 FORM_ENDPOINT 를 실제 Formspree 주소로 교체하세요.
   (DEPLOY.md의 "견적·문의 자동수집" 참고)
   ========================================================= */
window.HP_CONFIG = {
  // Formspree 폼 엔드포인트. 예: "https://formspree.io/f/abcdwxyz"
  // 미설정(xxxx 포함) 시 자동으로 메일 앱(mailto)으로 대체됩니다.
  FORM_ENDPOINT: "https://formspree.io/f/xaqrnvbe",
  EMAIL: "729497@gmail.com",
  BRAND: "디자인포",

  // Google Analytics 4 측정 ID. analytics.google.com → 관리 → 데이터 스트림에서 발급.
  // 비워 두면 분석 스크립트를 아예 불러오지 않습니다(추적 없음).
  // ⚠️ 계산기 URL의 쿼리(소득·자산 값)는 전송 전에 제거됩니다 — analytics.js 참고.
  GA_ID: "G-PLGV5HV9WH",
};
