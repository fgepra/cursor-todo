import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const todoSchema = z.object({
  title: z.string().describe("할 일의 제목"),
  description: z.string().optional().describe("할 일의 상세 설명"),
  due_date: z.string().describe("마감일 (YYYY-MM-DD 형식, 오늘이 2025-12-22라고 가정)"),
  due_time: z.string().optional().describe("마감 시간 (HH:MM 형식, 24시간제)"),
  priority: z.enum(["high", "medium", "low"]).describe("우선순위 (high/medium/low)"),
  category: z.string().optional().describe("카테고리 (업무/개인/학습/기타 등)"),
});

export const maxDuration = 30;

// 입력 검증 함수
function validateInput(text: string): { valid: boolean; error?: string } {
  // 빈 문자열 체크
  if (!text || typeof text !== "string") {
    return { valid: false, error: "입력 텍스트가 필요합니다." };
  }

  const trimmed = text.trim();

  // 최소 길이 체크
  if (trimmed.length < 2) {
    return {
      valid: false,
      error: "입력은 최소 2자 이상이어야 합니다.",
    };
  }

  // 최대 길이 체크
  if (trimmed.length > 500) {
    return {
      valid: false,
      error: "입력은 최대 500자까지 가능합니다.",
    };
  }

  return { valid: true };
}

// 입력 전처리 함수
function preprocessInput(text: string): string {
  // 앞뒤 공백 제거
  let processed = text.trim();

  // 연속된 공백을 하나로 통합
  processed = processed.replace(/\s+/g, " ");

  // 대소문자 정규화는 한국어에는 필요 없지만 영어 처리용으로 첫 글자만 대문자로 (선택적)
  // 한국어는 그대로 유지

  return processed;
}

// 후처리 함수
function postprocessResult(
  object: {
    title?: string;
    description?: string;
    due_date?: string;
    due_time?: string;
    priority?: string;
    category?: string;
  }
): {
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  priority: "high" | "medium" | "low";
  category?: string;
} {
  // 제목 검증 및 조정
  let title = object.title || "할 일";
  title = title.trim();

  // 제목이 너무 긴 경우 자르기 (최대 100자)
  if (title.length > 100) {
    title = title.substring(0, 97) + "...";
  }

  // 제목이 너무 짧은 경우 (1자 이하) 기본값 사용
  if (title.length < 1) {
    title = "할 일";
  }

  // 설명 검증
  let description = object.description?.trim();
  if (description && description.length === 0) {
    description = undefined;
  }

  // 날짜 검증 (과거 날짜 확인)
  let dueDate = object.due_date || new Date().toISOString().split("T")[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateObj = new Date(dueDate);
  dueDateObj.setHours(0, 0, 0, 0);

  // 과거 날짜인 경우 오늘로 설정
  if (dueDateObj < today) {
    dueDate = today.toISOString().split("T")[0];
  }

  // 시간 기본값 설정
  const dueTime = object.due_time || "09:00";

  // 우선순위 기본값 설정
  const priority =
    object.priority === "high" || object.priority === "low"
      ? object.priority
      : "medium";

  // 카테고리 검증
  const validCategories = ["업무", "개인", "건강", "학습"];
  let category = object.category?.trim();
  if (category && !validCategories.includes(category)) {
    category = undefined;
  }

  return {
    title,
    description,
    due_date: dueDate,
    due_time: dueTime,
    priority,
    category,
  };
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    // 입력 검증
    const validation = validateInput(text);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error || "입력 검증에 실패했습니다." },
        { status: 400 }
      );
    }

    // 입력 전처리
    const processedText = preprocessInput(text);

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 현재 날짜 기준으로 날짜 계산을 위한 컨텍스트 제공
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][today.getDay()];
    const tomorrowStr = getTomorrowDate(today);
    const dayAfterTomorrowStr = getDayAfterTomorrowDate(today);

    const { object } = await generateObject({
      model: google("gemini-2.5-flash"), // gemini-2.5-flash가 없으면 gemini-1.5-flash로 변경 가능
      schema: todoSchema,
      prompt: `다음 자연어 입력을 할 일 데이터로 변환해주세요. 오늘은 ${todayStr} (${dayOfWeek}요일)입니다.

입력: "${processedText}"

다음 규칙을 **반드시** 따르세요:

## 1. 날짜 처리 규칙 (due_date: YYYY-MM-DD 형식)
- "오늘" → ${todayStr} (현재 날짜)
- "내일" → ${tomorrowStr} (현재 날짜 + 1일)
- "모레" → ${dayAfterTomorrowStr} (현재 날짜 + 2일)
- "이번 주 [요일]" → 가장 가까운 해당 요일 (이번 주 내)
- "다음 주 [요일]" → 다음 주의 해당 요일
- 구체적인 날짜가 명시되지 않았으면 오늘(${todayStr})로 설정

## 2. 시간 처리 규칙 (due_time: HH:MM 형식, 24시간제)
- "아침" → 09:00
- "점심" → 12:00
- "오후" → 14:00
- "저녁" → 18:00
- "밤" → 21:00
- 구체적인 시간이 명시되지 않았거나 불명확하면 기본값 "09:00" 사용
- "오전 N시" → 0N:00 형식 (예: 오전 10시 = 10:00)
- "오후 N시" → (N+12):00 형식 (예: 오후 3시 = 15:00)
- "PM N시" → (N+12):00 형식

## 3. 우선순위 판단 규칙 (priority)
- **high**: "급하게", "중요한", "빨리", "꼭", "반드시" 등의 키워드가 포함된 경우
- **medium**: "보통", "적당히" 또는 우선순위 관련 키워드가 없는 경우 (기본값)
- **low**: "여유롭게", "천천히", "언젠가" 등의 키워드가 포함된 경우

## 4. 카테고리 분류 규칙 (category, 선택사항)
- **업무**: "회의", "보고서", "프로젝트", "업무" 등의 키워드
- **개인**: "쇼핑", "친구", "가족", "개인" 등의 키워드
- **건강**: "운동", "병원", "건강", "요가" 등의 키워드
- **학습**: "공부", "책", "강의", "학습" 등의 키워드
- 카테고리가 불명확하면 생략 (빈 문자열 또는 null)

## 5. 출력 형식
- **반드시 JSON 형식**으로 응답
- title: 할 일의 핵심 제목만 추출 (간결하게, 최대 100자)
- description: 입력 내용을 바탕으로 상세 설명 생성 (선택사항, 없으면 생략)
- due_date: YYYY-MM-DD 형식 (예: "2025-12-23")
- due_time: HH:MM 형식 (예: "15:00")
- priority: "high", "medium", "low" 중 하나
- category: "업무", "개인", "건강", "학습" 중 하나 또는 빈 문자열

위 규칙을 정확히 따라 JSON 형식으로 응답해주세요.`,
    });

    // 후처리
    const processedResult = postprocessResult(object);

    // due_date와 due_time을 결합하여 ISO 형식으로 변환
    const dueDateTime = processedResult.due_time
      ? `${processedResult.due_date}T${processedResult.due_time}:00`
      : `${processedResult.due_date}T09:00:00`;

    return Response.json({
      ...processedResult,
      due_date: dueDateTime,
    });
  } catch (error) {
    console.error("AI API error:", error);

    // 429 에러 (API 호출 한도 초과) 확인
    if (
      error instanceof Error &&
      (error.message.includes("429") ||
        error.message.includes("quota") ||
        error.message.includes("rate limit"))
    ) {
      return Response.json(
        {
          error: "API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.",
        },
        { status: 429 }
      );
    }

    // 500 에러 (AI 처리 실패)
    return Response.json(
      {
        error: "AI 처리 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// 날짜 계산 헬퍼 함수
function getTomorrowDate(today: Date): string {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

function getDayAfterTomorrowDate(today: Date): string {
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  return dayAfterTomorrow.toISOString().split("T")[0];
}

