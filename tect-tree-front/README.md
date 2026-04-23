# ATHENA DOCTRINE — Frontend

Next.js 14 App Router + TypeScript + TailwindCSS v4.

## 로컬 실행

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

http://localhost:3000

## 레이아웃

- `src/app/` — App Router 페이지
  - `(auth)/` — 로그인·회원가입
  - `mypage/` — 마이페이지 (인증 가드)
  - `tree/` — 트리 열람 + 노드 상세
  - `admin/` — 관리자 페이지 (관리자 가드)
- `src/components/` — UI 컴포넌트
- `src/lib/api.ts` — fetch 래퍼 (Bearer 토큰 자동 주입)
- `src/lib/ws.ts` — WebSocket 헬퍼
- `src/hooks/useAuth.ts` — 인증 훅
- `src/hooks/useTreeSocket.ts` — 관리자 트리 편집 WS 훅
- `src/types/` — 백엔드 스키마와 동기화된 TS 타입

## 환경변수

- `NEXT_PUBLIC_API_URL` — 백엔드 REST 기본 URL
- `NEXT_PUBLIC_WS_URL` — 백엔드 WS 기본 URL
- `NEXT_PUBLIC_TOSS_CLIENT_KEY` — 토스페이먼츠 클라이언트 키
