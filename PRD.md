# PRD – AI 기반 할 일 관리 서비스

## 1. 개요

### 1.1 제품 목적
본 제품은 **AI 기능을 결합한 개인 할 일(To-Do) 관리 웹 애플리케이션**이다.  
사용자는 기본적인 할 일 관리(CRUD) 기능뿐 아니라, 자연어 기반 할 일 생성과 AI 요약·분석 기능을 통해 생산성을 높일 수 있다.

### 1.2 핵심 가치
- 빠르고 직관적인 할 일 관리
- 자연어 입력만으로 할 일 자동 구조화
- AI 기반 일/주 단위 업무 요약 및 분석 제공

---

## 2. 주요 기능 요구사항

### 2.1 사용자 인증 (Supabase Auth)

#### 기능 설명
- 이메일/비밀번호 기반 회원가입 및 로그인
- 인증 상태 유지(Session 관리)
- 로그아웃 기능 제공

#### 요구사항
- Supabase Auth 사용
- 로그인 상태에 따라 접근 가능한 페이지 제어

---

### 2.2 할 일 관리 (CRUD)

#### 기능 설명
사용자는 자신의 할 일을 생성, 조회, 수정, 삭제할 수 있다.

#### 할 일 필드 정의
| 필드명 | 타입 | 설명 |
|------|------|------|
| id | UUID | 할 일 고유 ID |
| user_id | UUID | 사용자 ID (users 테이블 FK) |
| title | string | 할 일 제목 |
| description | text | 상세 설명 |
| created_date | timestamp | 생성일 |
| due_date | timestamp | 마감일 |
| priority | enum | high / medium / low |
| category | string | 업무 / 개인 / 학습 등 |
| completed | boolean | 완료 여부 |

#### 요구사항
- 사용자 본인의 할 일만 접근 가능
- 완료 여부 토글 가능

---

### 2.3 검색 / 필터 / 정렬

#### 검색
- 제목(title), 설명(description) 기준 검색

#### 필터
- 우선순위 : 높음 / 중간 / 낮음
- 카테고리 : 업무 / 개인 / 학습 등
- 진행 상태 : 진행 중 / 완료 / 지연

#### 정렬
- 우선순위순
- 마감일순
- 생성일순

---

### 2.4 AI 할 일 생성 기능

#### 기능 설명   
사용자가 자연어 문장으로 입력한 내용을 AI가 분석하여 할 일 데이터로 변환한다.

#### 입력 예
```
내일 오전 10시에 팀 회의 준비
```

#### 출력 예
```json
{
  "title": "팀 회의 준비",
  "description": "내일 오전 10시에 있을 팀 회의를 위해 자료 작성하기",
  "created_date": "YYYY-MM-DD HH:MM",
  "due_date": "YYYY-MM-DD 10:00",
  "priority": "high",
  "category": "업무",
  "completed": false
}
```

#### 요구사항
- Google Gemini API 사용
- 결과는 사용자 확인 후 저장

---

### 2.5 AI 요약 및 분석 기능

#### 일일 요약
- 오늘 완료한 할 일 목록
- 남은 작업 요약

#### 주간 요약
- 이번 주 전체 할 일 수
- 완료율(%)
- 가장 많이 수행한 카테고리

#### 요구사항
- 버튼 클릭 시 AI 분석 실행
- 텍스트 요약 형태로 제공

---

## 3. 화면 구성 (UX/UI)

### 3.1 로그인 / 회원가입 화면
- 이메일, 비밀번호 입력
- 회원가입 / 로그인 전환

### 3.2 할 일 관리 메인 화면
- 할 일 목록(List)
- 할 일 추가 버튼
- 검색창
- 필터 / 정렬 옵션
- AI 할 일 생성 입력창
- AI 요약 및 분석 버튼

### 3.3 확장 화면 (추후)
- 통계 대시보드
- 주간 활동량 차트
- 완료율 그래프
- 카테고리별 비중 시각화

---

## 4. 기술 스택

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend / BaaS
- Supabase
  - Auth
  - Database (PostgreSQL)
  - Row Level Security

### AI
- Google Gemini API
- AI SDK 활용

---

## 5. 데이터 구조 (Supabase)

### 5.1 users
- Supabase Auth 기본 테이블 사용

### 5.2 todos
```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_date TIMESTAMP DEFAULT now(),
  due_date TIMESTAMP,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  category TEXT,
  completed BOOLEAN DEFAULT false
);
```

### 보안 정책
- RLS 활성화
- user_id = auth.uid() 조건으로 접근 제한

---

## 6. 비기능 요구사항

- 반응형 UI 지원
- 모바일 / 데스크탑 최적화
- 평균 응답 시간 1초 이내
- 확장 가능 구조

---

## 7. 향후 확장 아이디어
- 푸시 알림 (마감 임박)
- 캘린더 연동
- 팀 단위 할 일 공유
- 음성 입력 기반 할 일 생성
