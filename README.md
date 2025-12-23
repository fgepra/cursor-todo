# AI 기반 할 일 관리 서비스

AI 기능을 결합한 개인 할 일(To-Do) 관리 웹 애플리케이션입니다. 자연어로 입력한 할 일을 AI가 자동으로 구조화하고, 일일/주간 분석을 통해 생산성을 높일 수 있습니다.

## 📋 주요 기능

### 1. 사용자 인증
- 이메일/비밀번호 기반 회원가입 및 로그인
- Supabase Auth를 통한 안전한 인증 관리
- 자동 세션 관리 및 라우트 보호

### 2. 할 일 관리 (CRUD)
- ✅ 할 일 생성, 조회, 수정, 삭제
- ✅ 완료/미완료 상태 토글
- ✅ 우선순위 설정 (높음/중간/낮음)
- ✅ 카테고리 분류 (업무/개인/학습/기타)
- ✅ 마감일 설정 및 관리

### 3. 검색 및 필터링
- 🔍 제목 기반 검색
- 📊 상태별 필터링 (전체/완료/미완료)
- 🎯 우선순위별 필터링
- 📁 카테고리별 필터링
- 🔄 정렬 기능 (생성일/마감일/우선순위/제목)

### 4. AI 할 일 생성
- 🤖 자연어 입력만으로 할 일 자동 생성
- 📅 날짜/시간 자동 추출 및 변환
- ⚡ 우선순위 자동 판단
- 🏷️ 카테고리 자동 분류
- Google Gemini 2.5 Flash 모델 사용

### 5. AI 요약 및 분석
- 📈 오늘의 할 일 요약 및 분석
- 📊 이번 주 할 일 통계 및 패턴 분석
- 💡 완료율, 우선순위 분포 분석
- ⏰ 시간대별 업무 집중도 분석
- 🎯 실행 가능한 추천 사항 제공

### 6. 추가 기능
- 🌓 다크 모드/라이트 모드 지원
- 📄 페이지네이션 (할 일 목록 5개 이상 시)
- 🎨 현대적인 UI/UX (shadcn/ui 컴포넌트)
- 📱 반응형 디자인

## 🛠️ 기술 스택

### Frontend
- **Next.js 16.1.0** (App Router)
- **TypeScript 5**
- **React 19.2.3**
- **Tailwind CSS 4**
- **shadcn/ui** - UI 컴포넌트 라이브러리
- **react-hook-form** - 폼 관리
- **zod** - 스키마 검증
- **date-fns** - 날짜 처리
- **next-themes** - 테마 관리

### Backend / BaaS
- **Supabase**
  - Authentication (이메일/비밀번호)
  - PostgreSQL Database
  - Row Level Security (RLS)

### AI
- **Google Gemini 2.5 Flash**
- **AI SDK** (`@ai-sdk/google`)
- **generateObject** - 구조화된 데이터 생성

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.x 이상
- npm, yarn, pnpm 또는 bun
- Supabase 계정
- Google AI Studio API 키

### 설치

1. 프로젝트 클론
```bash
git clone <repository-url>
cd todo
```

2. 의존성 설치
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 변수를 추가하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key
```

### 데이터베이스 설정

1. Supabase 프로젝트 생성 및 데이터베이스 접속

2. `schema.sql` 파일의 SQL 쿼리를 Supabase SQL Editor에서 실행하세요.

   이 스크립트는 다음을 생성합니다:
   - `public.users` 테이블 (사용자 프로필)
   - `public.todos` 테이블 (할 일 데이터)
   - Row Level Security (RLS) 정책
   - 인덱스 및 트리거

### 개발 서버 실행

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📁 프로젝트 구조

```
todo/
├── app/                          # Next.js App Router
│   ├── api/                      # API 라우트
│   │   └── ai/
│   │       ├── todos/            # AI 할 일 생성 API
│   │       │   └── route.ts
│   │       └── summary/          # AI 요약 및 분석 API
│   │           └── route.ts
│   ├── login/                    # 로그인 페이지
│   │   └── page.tsx
│   ├── signup/                   # 회원가입 페이지
│   │   └── page.tsx
│   ├── globals.css               # 전역 스타일
│   ├── layout.tsx                # 루트 레이아웃
│   └── page.tsx                  # 메인 페이지 (할 일 목록)
├── components/
│   ├── todo/                     # 할 일 관련 컴포넌트
│   │   ├── TodoCard.tsx          # 개별 할 일 카드
│   │   ├── TodoForm.tsx          # 할 일 추가/수정 폼
│   │   ├── TodoList.tsx          # 할 일 목록
│   │   ├── types.ts              # TypeScript 타입 정의
│   │   └── index.ts
│   ├── ui/                       # shadcn/ui 컴포넌트
│   └── theme-provider.tsx        # 테마 제공자
├── lib/
│   └── supabase/
│       ├── client.ts             # 클라이언트용 Supabase 클라이언트
│       └── server.ts             # 서버용 Supabase 클라이언트
├── middleware.ts                 # 인증 미들웨어
├── schema.sql                    # 데이터베이스 스키마
└── package.json
```

## 🎯 주요 기능 상세

### AI 할 일 생성

자연어 입력 예시:
- "내일 오후 3시까지 중요한 팀 회의 준비하기"
- "다음 주 월요일 오전 10시에 프로젝트 발표 준비"
- "이번 주 금요일까지 보고서 작성"

AI가 자동으로 추출하는 정보:
- 제목
- 설명
- 마감일 및 시간
- 우선순위 (high/medium/low)
- 카테고리 (업무/개인/학습/기타)

### AI 요약 및 분석

**오늘의 요약**
- 오늘 할 일 목록 및 완료율
- 긴급한 할 일 강조
- 시간대별 업무 집중도
- 당일 집중도 및 우선순위 제안

**이번 주 요약**
- 주간 완료율 및 통계
- 우선순위별 완료 패턴
- 생산성 패턴 분석
- 다음 주 계획 제안

## 🔐 보안

- Supabase Row Level Security (RLS)로 데이터 접근 제어
- 사용자는 본인의 할 일만 접근 가능
- 인증된 사용자만 보호된 라우트 접근
- API 키는 환경 변수로 관리

## 🎨 UI/UX 특징

- **브랜드 컬러**: 틸(Teal) 계열 색상 사용
- **다크 모드**: 완전한 다크 모드 지원
- **반응형 디자인**: 모바일, 태블릿, 데스크탑 최적화
- **접근성**: 키보드 네비게이션 및 스크린 리더 지원
- **애니메이션**: 부드러운 전환 효과

## 📝 스크립트

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 린트 검사
npm run lint
```

## 🤝 기여하기

이슈를 제출하거나 풀 리퀘스트를 보내주시면 환영합니다!

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 🔮 향후 계획

- [ ] 푸시 알림 (마감 임박 알림)
- [ ] 캘린더 연동
- [ ] 팀 단위 할 일 공유
- [ ] 음성 입력 기반 할 일 생성
- [ ] 통계 대시보드 (차트 및 그래프)
- [ ] 할 일 템플릿 기능
- [ ] 반복 할 일 설정

---

**문의사항이나 버그 리포트는 이슈를 통해 알려주세요!** 🚀