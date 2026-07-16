#!/usr/bin/env node
/**
 * 홈플래닝 — AI 정책 자동 갱신 스크립트
 * 매일 GitHub Actions 크론으로 실행.
 * Claude(claude-opus-4-8)가 웹검색으로 최신 부동산·금융 정책을 파악해
 * data/policy.json 의 headline / highlights 를 갱신한다.
 * 핵심 계산 상수(LTV·DSR 등)는 "확정된 공식 변경"일 때만 반영하도록 지시.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = path.join(__dirname, "..", "data", "policy.json");

const TODAY = process.env.RUN_DATE || new Date().toISOString().slice(0, 10);

function fail(msg) {
  console.error(`[update-policy] 실패: ${msg}`);
  process.exit(1);
}

const current = JSON.parse(fs.readFileSync(POLICY_PATH, "utf-8"));

if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_API_KEY.trim()) {
  fail(
    "ANTHROPIC_API_KEY 가 비어 있습니다.\n" +
      "  GitHub 저장소 → Settings → Secrets and variables → Actions →\n" +
      "  'Secrets' 탭의 'Repository secrets' 에 이름 'ANTHROPIC_API_KEY' 로 등록됐는지 확인하세요.\n" +
      "  (Variables 탭 아님 / Environment secret 아님 / 이름 대소문자·공백 주의)"
  );
}

const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용

const SYSTEM = `당신은 대한민국 부동산·금융 정책 분석가입니다.
사회초년생 대상 계산기 사이트 '홈플래닝'의 정책 데이터를 매일 갱신합니다.
반드시 신뢰할 수 있는 출처(정부 발표, 주요 언론, 금융기관 공지)만 사용하고,
확인되지 않은 내용은 반영하지 마세요. 모든 값은 참고용 추정치임을 전제합니다.`;

const PROMPT = `오늘 날짜는 ${TODAY} 입니다.
아래는 현재 홈플래닝의 정책 데이터(JSON)입니다.

\`\`\`json
${JSON.stringify(current, null, 2)}
\`\`\`

웹 검색으로 다음을 확인하세요:
1) 최근 대한민국 주택담보대출/LTV/DSR/스트레스 DSR 관련 정책 변화
2) 디딤돌·보금자리론·신생아 특례 등 정책대출 금리·한도 변화
3) 청년도약계좌 등 청년 자산형성 정책 변화
4) 2030 세대 내집마련에 영향 주는 최신 뉴스

그런 다음 **업데이트된 policy.json 전체**를 반환하세요. 규칙:
- 전체 구조와 키를 그대로 유지합니다. (계산기가 이 JSON을 직접 읽습니다)
- headline: 오늘 기준 가장 중요한 정책 상황을 한 문장으로.
- highlights: 최신 이슈 3개. 각 {title, summary, tag, date, url}. url은 실제 기사/발표 링크(없으면 빈 문자열).
- 숫자 필드(ltv, dsr, stress_rate, loan_abs_cap, acquisition_tax, policy_loans, savings_products)는
  **공식적으로 확정된 변경**을 확인한 경우에만 수정하고, 그렇지 않으면 기존 값을 그대로 둡니다.
- meta.updated_at 을 "${TODAY}" 로, meta.updated_by 를 "ai" 로 설정합니다.

응답은 반드시 아래 형식으로, 코드펜스 안에 **완전한 JSON만** 담아 반환하세요:
\`\`\`json
{ ...전체 policy.json... }
\`\`\``;

async function run() {
  const params = {
    model: "claude-opus-4-8",
    max_tokens: 8000,
    system: SYSTEM,
    thinking: { type: "adaptive" },
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
    messages: [{ role: "user", content: PROMPT }],
  };

  let response = await client.messages.create(params);
  // 서버툴(web_search) 루프가 pause_turn 으로 멈추면 이어서 진행
  let guard = 0;
  const msgs = [...params.messages];
  while (response.stop_reason === "pause_turn" && guard++ < 6) {
    msgs.push({ role: "assistant", content: response.content });
    response = await client.messages.create({ ...params, messages: msgs });
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const match = text.match(/```json\s*([\s\S]*?)```/);
  const raw = match ? match[1] : text;
  let updated;
  try {
    updated = JSON.parse(raw.trim());
  } catch (e) {
    fail(`JSON 파싱 실패: ${e.message}\n원문 일부:\n${text.slice(0, 500)}`);
  }

  // 안전 검증: 핵심 키가 모두 있어야 저장
  const required = ["meta", "headline", "highlights", "ltv", "dsr", "policy_loans"];
  for (const k of required) {
    if (!(k in updated)) fail(`필수 키 누락: ${k}`);
  }
  if (!Array.isArray(updated.highlights) || updated.highlights.length === 0) {
    fail("highlights 가 비어 있음");
  }
  updated.meta = { ...current.meta, ...updated.meta, updated_at: TODAY, updated_by: "ai" };

  fs.writeFileSync(POLICY_PATH, JSON.stringify(updated, null, 2) + "\n", "utf-8");
  console.log(`[update-policy] 갱신 완료 (${TODAY}) — headline: ${updated.headline}`);
}

run().catch((e) => fail(e.stack || String(e)));
