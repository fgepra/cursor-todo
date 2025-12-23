import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const summarySchema = z.object({
  summary: z.string().describe("할 일 요약 (완료율 포함)"),
  urgentTasks: z.array(z.string()).describe("긴급한 할 일 목록 (제목만)"),
  insights: z.array(z.string()).describe("인사이트 (분석 결과)"),
  recommendations: z.array(z.string()).describe("추천 사항"),
});

export const maxDuration = 30;

interface Todo {
  id: string;
  title: string;
  description?: string | null;
  created_date: string;
  due_date?: string | null;
  priority: "high" | "medium" | "low";
  category?: string | null;
  completed: boolean;
}

export async function POST(request: Request) {
  try {
    const { todos, period } = await request.json();

    if (!todos || !Array.isArray(todos)) {
      return Response.json(
        { error: "할 일 목록이 필요합니다." },
        { status: 400 }
      );
    }

    if (!period || !["today", "week"].includes(period)) {
      return Response.json(
        { error: "분석 기간(today/week)이 필요합니다." },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 통계 계산
    const total = todos.length;
    const completed = todos.filter((todo: Todo) => todo.completed).length;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0";
    
    const urgentTasks = todos.filter(
      (todo: Todo) => !todo.completed && todo.priority === "high"
    );
    
    const highPriorityCount = todos.filter(
      (todo: Todo) => todo.priority === "high"
    ).length;
    const mediumPriorityCount = todos.filter(
      (todo: Todo) => todo.priority === "medium"
    ).length;
    const lowPriorityCount = todos.filter(
      (todo: Todo) => todo.priority === "low"
    ).length;

    // 카테고리별 통계
    const categoryCount: Record<string, number> = {};
    todos.forEach((todo: Todo) => {
      const category = todo.category || "기타";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    // 시간대별 분석 (due_date가 있는 경우)
    const timeSlots: Record<string, number> = {
      아침: 0,
      오전: 0,
      점심: 0,
      오후: 0,
      저녁: 0,
      밤: 0,
    };

    todos.forEach((todo: Todo) => {
      if (todo.due_date) {
        const date = new Date(todo.due_date);
        const hour = date.getHours();
        if (hour >= 6 && hour < 9) timeSlots.아침++;
        else if (hour >= 9 && hour < 12) timeSlots.오전++;
        else if (hour >= 12 && hour < 14) timeSlots.점심++;
        else if (hour >= 14 && hour < 18) timeSlots.오후++;
        else if (hour >= 18 && hour < 22) timeSlots.저녁++;
        else timeSlots.밤++;
      }
    });

    const periodText = period === "today" ? "오늘" : "이번 주";
    
    // 우선순위별 완료율 계산
    const priorityCompletion: Record<string, { total: number; completed: number }> = {
      high: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      low: { total: 0, completed: 0 },
    };
    
    todos.forEach((todo: Todo) => {
      priorityCompletion[todo.priority].total++;
      if (todo.completed) {
        priorityCompletion[todo.priority].completed++;
      }
    });

    // 마감일 준수율 계산 (과거 마감일 중 완료된 것)
    const pastDueTodos = todos.filter((todo: Todo) => {
      if (!todo.due_date || todo.completed) return false;
      const dueDate = new Date(todo.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
    
    // 완료된 할 일의 마감일 준수 여부
    const completedWithDueDate = todos.filter((todo: Todo) => todo.completed && todo.due_date);
    const onTimeCompleted = completedWithDueDate.filter((todo: Todo) => {
      const dueDate = new Date(todo.due_date!);
      const today = new Date();
      return dueDate >= today || Math.abs((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 1;
    });
    const deadlineComplianceRate = completedWithDueDate.length > 0
      ? ((onTimeCompleted.length / completedWithDueDate.length) * 100).toFixed(1)
      : "0";

    // 요일별 완료 패턴 (생산적인 요일 분석용)
    const dayOfWeekPattern: Record<string, { total: number; completed: number }> = {};
    todos.forEach((todo: Todo) => {
      if (todo.completed && todo.due_date) {
        const dueDate = new Date(todo.due_date);
        const dayName = ["일", "월", "화", "수", "목", "금", "토"][dueDate.getDay()];
        if (!dayOfWeekPattern[dayName]) {
          dayOfWeekPattern[dayName] = { total: 0, completed: 0 };
        }
        dayOfWeekPattern[dayName].completed++;
      }
      if (todo.due_date) {
        const dueDate = new Date(todo.due_date);
        const dayName = ["일", "월", "화", "수", "목", "금", "토"][dueDate.getDay()];
        if (!dayOfWeekPattern[dayName]) {
          dayOfWeekPattern[dayName] = { total: 0, completed: 0 };
        }
        dayOfWeekPattern[dayName].total++;
      }
    });

    // 완료하기 쉬운 작업 특징 (완료된 작업 중 공통 특징)
    const completedTodos = todos.filter((todo: Todo) => todo.completed);
    const completedCategories = completedTodos.map((todo: Todo) => todo.category || "없음");
    const mostCompletedCategory = Object.entries(
      completedCategories.reduce((acc: Record<string, number>, cat) => {
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {})
    ).sort(([, a], [, b]) => b - a)[0]?.[0] || "없음";

    const todosData = todos.map((todo: Todo) => ({
      제목: todo.title,
      완료여부: todo.completed ? "완료" : "미완료",
      우선순위: todo.priority === "high" ? "높음" : todo.priority === "medium" ? "중간" : "낮음",
      카테고리: todo.category || "없음",
      마감일: todo.due_date || "없음",
      생성일: todo.created_date,
    }));

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: summarySchema,
      prompt: `${periodText} 할 일 목록을 심층 분석하여 상세한 요약, 인사이트, 그리고 실행 가능한 추천을 제공해주세요. 오늘 날짜는 ${todayStr}입니다.

## 할 일 데이터:
${JSON.stringify(todosData, null, 2)}

## 통계 데이터:
- 전체 할 일: ${total}개
- 완료: ${completed}개 (완료율 ${completionRate}%)
- 미완료: ${total - completed}개
- 우선순위 분포: 높음 ${highPriorityCount}개, 중간 ${mediumPriorityCount}개, 낮음 ${lowPriorityCount}개
- 우선순위별 완료율:
  * 높음: ${priorityCompletion.high.completed}/${priorityCompletion.high.total}개 완료 (${priorityCompletion.high.total > 0 ? ((priorityCompletion.high.completed / priorityCompletion.high.total) * 100).toFixed(1) : "0"}%)
  * 중간: ${priorityCompletion.medium.completed}/${priorityCompletion.medium.total}개 완료 (${priorityCompletion.medium.total > 0 ? ((priorityCompletion.medium.completed / priorityCompletion.medium.total) * 100).toFixed(1) : "0"}%)
  * 낮음: ${priorityCompletion.low.completed}/${priorityCompletion.low.total}개 완료 (${priorityCompletion.low.total > 0 ? ((priorityCompletion.low.completed / priorityCompletion.low.total) * 100).toFixed(1) : "0"}%)
- 카테고리 분포: ${Object.entries(categoryCount).map(([cat, count]) => `${cat} ${count}개`).join(", ")}
- 시간대별 분포: ${Object.entries(timeSlots).filter(([_, count]) => count > 0).map(([time, count]) => `${time} ${count}개`).join(", ") || "없음"}
- 마감일 준수율: ${deadlineComplianceRate}% (완료된 할 일 중 마감일에 맞춘 비율)
- 연기된 할 일: ${pastDueTodos.length}개 (과거 마감일이지만 아직 미완료)
- 가장 많이 완료한 카테고리: ${mostCompletedCategory}
${Object.keys(dayOfWeekPattern).length > 0 ? `- 요일별 완료 패턴: ${Object.entries(dayOfWeekPattern).map(([day, stats]) => `${day}요일 ${stats.completed}/${stats.total}개`).join(", ")}` : ""}

## 분석 요청사항:

### 1. 완료율 분석
- ${periodText} 전체 완료율과 우선순위별 완료 패턴을 분석해주세요
- 높은 우선순위 작업의 완료율이 낮다면 그 원인을 추론해주세요
- 완료율이 높은 우선순위나 카테고리에서 발견되는 패턴을 설명해주세요

### 2. 시간 관리 분석
- 마감일 준수율(${deadlineComplianceRate}%)을 기반으로 시간 관리 능력을 평가해주세요
- 연기된 할 일(${pastDueTodos.length}개)의 특징과 공통점을 분석해주세요 (카테고리, 우선순위 등)
- 시간대별 업무 집중도 분포를 분석하고, 업무가 집중된 시간대와 그 영향에 대해 설명해주세요

### 3. 생산성 패턴
- 요일별 완료 패턴을 분석하여 가장 생산적인 요일을 도출해주세요
- 시간대별 분포를 보고 가장 활발한 작업 시간대를 분석해주세요
- 완료하기 쉬운 작업의 공통 특징을 분석해주세요 (카테고리: ${mostCompletedCategory} 등)
- 자주 미루거나 완료되지 않는 작업의 유형과 특징을 분석해주세요

### 4. 실행 가능한 추천
- 구체적이고 실천 가능한 시간 관리 팁 2-3가지를 제시해주세요
- 우선순위 조정이 필요한 항목이나 일정 재배치 제안을 구체적으로 해주세요
- 업무 과부하를 줄이기 위한 작업 분산 전략을 제시해주세요

### 5. 긍정적 피드백
- 사용자가 잘하고 있는 부분을 구체적으로 강조하고 칭찬해주세요 (예: "높은 우선순위 작업을 잘 처리하고 있습니다", "마감일 준수율이 우수합니다" 등)
- 개선점을 지적할 때는 격려하고 동기부여하는 톤으로 작성해주세요
- 마지막에 "화이팅!" 또는 "좋은 일주일 되세요" 같은 긍정적인 메시지를 포함해주세요

### 6. 기간별 차별화
${period === "today"
        ? `- **오늘의 요약**에 집중: 오늘의 할 일 집중도와 남은 시간을 고려한 우선순위 제시
- 오늘 하루 남은 시간을 효율적으로 활용할 수 있는 구체적인 제안`
        : `- **이번 주 요약**에 집중: 주간 패턴과 트렌드 분석
- 다음 주 계획 수립을 위한 구체적인 제안과 목표 설정`}

## 출력 형식:
1. **summary**: ${periodText} 할 일 요약 (완료율, 주요 성과 포함, 예: "총 8개의 할 일 중 5개 완료(62.5%), 높은 우선순위 작업을 우수하게 처리했습니다")
2. **urgentTasks**: 긴급한 미완료 할 일 제목 목록 (최대 5개, 과거 마감일 포함)
3. **insights**: 
   - 완료율 심층 분석 (우선순위별, 카테고리별 패턴)
   - 시간 관리 능력 평가 (마감일 준수율, 연기 패턴 분석)
   - 생산성 패턴 발견 (생산적인 요일/시간대, 완료하기 쉬운/어려운 작업 유형)
   - 각 인사이트는 2-3문장으로 구체적이고 이해하기 쉽게 작성
4. **recommendations**: 
   - 구체적이고 실행 가능한 시간 관리 팁
   - 우선순위 조정 및 일정 재배치 제안
   - 업무 분산 전략
   - 각 추천은 한 문장으로 명확하게 작성 (최대 3개)

친근하고 격려하는 톤으로, 사용자의 노력을 인정하면서도 구체적인 개선 방향을 제시해주세요. 자연스럽고 이해하기 쉬운 한국어 문장으로 작성해주세요.`,
    });

    return Response.json(object);
  } catch (error) {
    console.error("AI Summary API error:", error);

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
        error: "AI 분석 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

