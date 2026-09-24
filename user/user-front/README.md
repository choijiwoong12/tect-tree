# ATHENA DOCTRINE — Frontend (Supabase Migration Complete)

기존 FastAPI + Docker 백엔드 아키텍처에서 **Next.js 14 App Router + Supabase** 단일 프론트엔드 환경으로 성공적으로 마이그레이션된 프로젝트입니다.

## 🚀 기술 스택
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **Database & Auth**: Supabase (PostgreSQL)
- **Payments**: TossPayments (토스페이먼츠 위젯 SDK)

---

## 🛠️ 로컬 개발 환경 및 테스트 구축 방법

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
루트 디렉토리에 `.env.local` 파일을 생성하고 아래 변수들을 입력합니다.

```env
# 1. Supabase 접속 정보 (대시보드 -> Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG... (anon / public)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (service_role / secret)

# 2. 토스페이먼츠 접속 정보 (토스 개발자 센터 -> API 키)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_... (테스트 클라이언트 키)
TOSS_SECRET_KEY=test_sk_... (테스트 시크릿 키)
```

> **주의**: 
> - `SUPABASE_SERVICE_ROLE_KEY`와 `TOSS_SECRET_KEY`는 서버(Next.js API Route)에서만 실행되며 절대 브라우저에 노출되어서는 안 되는 비밀 키입니다.
> - `NEXT_PUBLIC_` 접두사가 붙은 키는 브라우저 컴포넌트(로그인, 결제창 띄우기)에서 사용됩니다.

### 3. 로컬 서버 실행
```bash
npm run dev
```
접속: `http://localhost:3000`

### 4. Google OAuth 설정
앱은 Supabase Auth의 Google Provider를 사용합니다. Google Client ID와 Client Secret은 `.env.local`이 아니라 Supabase 대시보드에 등록합니다.

1. Google Cloud Console OAuth 클라이언트의 **Authorized redirect URI**에 아래 값을 추가합니다.
```text
https://[PROJECT-ID].supabase.co/auth/v1/callback
```

2. Supabase Dashboard -> Authentication -> Providers -> Google에서 Google provider를 활성화하고 Client ID / Client Secret을 입력합니다.

3. Supabase Dashboard -> Authentication -> URL Configuration에 아래 값을 설정합니다.
```text
Site URL: http://localhost:3000
Redirect URLs:
http://localhost:3000/auth/callback
https://[배포-도메인]/auth/callback
```

---

## 💡 주요 테스트 흐름 (User Flow)

1. **회원가입 및 로그인 (`/signup` -> `/login`)**
   - Supabase Auth를 이용하여 로그인 세션이 생성됩니다.
2. **결제 테스트 진입 (`/checkout`)**
   - 메인 화면(`http://localhost:3000`)의 **[결제 테스트]** 링크를 클릭합니다.
   - `src/app/checkout/actions.ts`가 서버에서 실행되어 보안 규칙(RLS)을 우회해 임시 5,000원 테스트 상품(products)과 주문(orders) 데이터를 DB에 자동 생성합니다.
3. **위젯 결제 진행**
   - 토스페이먼츠 SDK가 초기화되며 결제 수단을 선택할 수 있습니다.
4. **승인 및 완료 (`/checkout/success`)**
   - 결제 인증 후 `POST /api/payments/confirm` 라우트가 호출됩니다.
   - 서버에서 `TOSS_SECRET_KEY`를 이용해 실제 결제 승인을 받고, DB의 `rp_transactions`에 결제 로그를 남긴 후 유저의 `rp_balance`를 충전합니다.

---

## 📁 주요 디렉토리 구조

- `src/app/` — Next.js App Router 페이지
  - `(auth)/` — 로그인 및 회원가입 페이지
  - `api/payments/confirm/` — 토스페이먼츠 최종 결제 승인 API
  - `checkout/` — 토스 결제 위젯 UI 및 성공/실패 콜백 페이지
- `src/components/auth/` — Supabase Auth 로직이 연동된 UI 컴포넌트
- `src/lib/supabase/` — Supabase 클라이언트 유틸리티 (Browser / Server / Admin)
- `src/hooks/useAuth.ts` — 사용자 인증 상태를 구독하고 불러오는 React Hook
