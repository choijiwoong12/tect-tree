# ATHENA DOCTRINE TECH TREE

> 노드 기반 테크트리 열람 서비스 — 사용자는 RP(포인트)를 충전하고 노드를 해금하여 계층적 콘텐츠를 탐색합니다.

기존 FastAPI + MySQL + Docker 환경에서 **Next.js 14 (App Router) + Supabase (PostgreSQL) 서버리스 환경**으로 전면 마이그레이션 되었습니다. 모든 백엔드 로직은 Next.js API Routes와 Supabase에 통합되어 관리가 매우 간편해졌습니다.

---

## 🚀 기술 스택

- **프론트엔드/백엔드 통합**: Next.js 14.2 (App Router)
- **언어**: TypeScript
- **스타일링**: TailwindCSS v4
- **데이터베이스 및 인증**: Supabase (PostgreSQL, Auth)
- **결제 연동**: 토스페이먼츠 (TossPayments Widget SDK)

---

## 📋 프로젝트 구조

```
user/
├── user-front/                  # 핵심 프로젝트 폴더 (Next.js 14)
│   ├── public/                  # 정적 파일
│   ├── src/
│   │   ├── app/                 # 라우팅 페이지 및 서버 API (Next.js App Router)
│   │   │   ├── (auth)/          # 로그인, 회원가입 페이지
│   │   │   ├── api/payments/    # 결제 승인 API (Toss API 서버 연동)
│   │   │   ├── checkout/        # 토스 결제 위젯 및 성공/실패 콜백 페이지
│   │   │   ├── mypage/          # 마이페이지
│   │   │   └── tree/            # 트리 열람 및 노드 상세
│   │   ├── components/          # UI 컴포넌트
│   │   ├── hooks/               # React 커스텀 훅
│   │   ├── lib/supabase/        # Supabase 클라이언트 유틸 (Browser, Server, Admin)
│   │   └── types/               # TypeScript 타입 정의
│   ├── package.json             # 의존성 관리
│   ├── next.config.mjs          # Next.js 설정
│   └── .env.local               # 환경 변수 (Supabase & Toss 키)
└── README.md                    # 프로젝트 전체 가이드 (현재 문서)
```

---

## 🎯 핵심 기능

| 기능           | 설명                                                          |
| -------------- | ------------------------------------------------------------- |
| **회원 인증**  | Supabase Auth를 활용한 이메일 기반 회원가입/로그인            |
| **마이페이지** | 프로필 확인, RP 잔액 및 거래 내역 확인                        |
| **RP 시스템**  | 토스페이먼츠 결제 위젯 연동 → 결제 완료 시 DB 원장에 RP 충전  |
| **트리 열람**  | 전체 트리 시각화, 노드 해금(RP 차감), 콘텐츠 열람             |

---

## ⚙️ 로컬 개발 환경 실행 방법

이제 복잡한 도커(Docker) 설정 없이, 프론트엔드 폴더에서 바로 실행이 가능합니다.

### 1. 패키지 설치
```bash
cd user-front
npm install
```

### 2. 환경 변수 설정
`user-front/.env.local` 파일을 생성하고 아래 내용을 입력합니다.
```env
# Supabase 접속 정보
NEXT_PUBLIC_SUPABASE_URL=https://[당신의-프로젝트-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[당신의-ANON-키]
SUPABASE_SERVICE_ROLE_KEY=[당신의-SERVICE-ROLE-키]

# 토스페이먼츠 접속 정보
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_[당신의-테스트-클라이언트-키]
TOSS_SECRET_KEY=test_sk_[당신의-테스트-시크릿-키]
```

### 3. 서버 실행
```bash
npm run dev
```
👉 `http://localhost:3000` 접속

---

## 🗄️ 데이터베이스 스키마 (Supabase)

Supabase PostgreSQL 환경에 아래 테이블들이 구성되어 있습니다. RLS(Row Level Security) 정책이 적용되어 데이터 접근을 안전하게 제어합니다.

- **`users`**: 사용자 프로필 및 RP 잔액 (auth.users와 연동)
- **`products`**: RP 충전 등 상점 내 판매 상품 목록
- **`orders`**: 유저의 주문 내역 및 진행 상태 관리
- **`payments`**: 토스페이먼츠에서 승인된 실제 결제 로그
- **`rp_transactions`**: RP(포인트) 충전/사용 내역 관리 (회계 장부)
- **`nodes`**: 테크트리를 구성하는 개별 콘텐츠 노드
- **`node_unlocks`**: 사용자가 특정 노드를 해금(구매)했는지 여부 기록

*(초기 DB 세팅을 위한 SQL 코드는 프로젝트 내 `user-front/supabase_schema.sql`에 저장되어 있습니다.)*

---

## 💳 결제 테스트 흐름 (TossPayments)

현재 기능 검증을 위해 `http://localhost:3000` 메인 화면에 **[결제 테스트]** 버튼이 준비되어 있습니다.
1. 회원가입 및 로그인 수행
2. 홈 화면의 [결제 테스트] 클릭 시 토스 위젯 로드 (`app/checkout/page.tsx`)
3. 가상의 5,000원 상품 결제 진행
4. 완료 시 `app/api/payments/confirm` 라우트에서 토스 서버를 통해 최종 승인
5. 데이터베이스의 `rp_transactions`에 충전 내역 기록 및 잔액(balance) 갱신

---

## 📈 향후 배포 및 작업 가이드

- **Vercel 배포**: Github 저장소 연동 후 Vercel 대시보드에서 `user-front`를 Root 디렉토리로 설정하여 바로 배포할 수 있습니다. (Vercel 환경 변수 설정 시 `.env.local`의 값들을 꼭 똑같이 입력해 주세요.)
- **다음 개발 과제**:
  - 사용자 마이페이지 화면 및 상세 프로필 연동
  - 상품(products) 목록을 불러와 실제 장바구니/스토어 기능 구현
  - 노드/트리 캔버스(react-flow 등) 시각화 개발
