# ATHENA DOCTRINE TECH TREE

노드 기반 학습 콘텐츠 플랫폼 **ATHENA DOCTRINE**의 외주 개발 프로젝트입니다.
관리자는 테크트리 구조와 콘텐츠를 편집하고, 사용자는 RP(포인트)를 충전해 노드를 해금하고 콘텐츠를 열람합니다.

이 저장소는 **관리자 CMS(`admin`)**와 **사용자 서비스(`user/user-front`)**를 함께 관리합니다. 두 애플리케이션은 각각 의존성, 환경 변수, 실행 및 배포 설정을 갖습니다.

## 프로젝트 구성

| 구분 | 관리자 CMS | 사용자 서비스 |
| --- | --- | --- |
| 경로 | `admin/` | `user/user-front/` |
| 주요 역할 | 테크트리 및 학습 콘텐츠 관리 | 회원 인증, RP 충전, 노드 해금 및 콘텐츠 열람 |
| 로컬 주소 | http://localhost:3001 | http://localhost:3000 |
| 상세 문서 | [Admin README](admin/README.md) | [User README](user/README.md) |

```text
.
├── README.md
├── admin/                       # 관리자 CMS (Next.js)
│   ├── public/
│   ├── src/
│   │   ├── app/                 # 관리자 화면 및 REST API
│   │   ├── components/          # 그래프, 노드 편집기, 대시보드
│   │   └── lib/                 # Supabase 연결 및 유틸리티
│   ├── .env.local.example
│   ├── package.json
│   └── README.md
└── user/
    ├── README.md
    └── user-front/              # 사용자 서비스 (Next.js)
        ├── public/
        ├── src/
        │   ├── app/             # 인증, 테크트리, 결제, 마이페이지 및 API
        │   ├── components/      # 사용자 화면 컴포넌트
        │   ├── hooks/           # React 커스텀 훅
        │   ├── lib/supabase/    # 브라우저·서버용 Supabase 연결
        │   └── types/           # TypeScript 타입
        ├── .env.example
        ├── supabase_schema.sql
        └── package.json
```

## 주요 기능

### 관리자 CMS

- **테크트리 편집**: 노드 생성, 부모 노드 지정, 그래프 위치 조정 및 제목 검색
- **콘텐츠 관리**: 카테고리·문서·파일 노드의 기본 정보, 잠금 여부 및 가격 설정
- **리치 텍스트 편집**: Tiptap 기반 본문 편집 및 H1 제목에서 목차 자동 추출
- **레벨 관리**: 타원형 영역의 중심과 크기를 설정해 노드의 레벨 소속 계산
- **콘텐츠 API**: 노드 목록·상세 조회와 사용자별 읽기 진도 조회·저장 API 제공

### 사용자 서비스

- **회원 인증**: Supabase Auth 기반 회원가입 및 로그인
- **테크트리 탐색**: 노드 구조 탐색 및 콘텐츠 열람
- **RP 및 노드 해금**: 포인트 충전과 RP를 사용한 노드 해금
- **결제 연동**: 토스페이먼츠 결제 위젯 및 서버 측 결제 승인
- **마이페이지**: 사용자 프로필, RP 잔액 및 거래 내역 확인

사용자 README에는 마이페이지 상세 연동, 상품 목록 및 트리 시각화가 후속 작업으로도 기재되어 있습니다. 인수인계 시 해당 항목의 실제 구현 범위는 현재 코드와 실행 화면을 기준으로 확인해야 합니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 애플리케이션 | Next.js 14, App Router, React |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS — 관리자 v3, 사용자 v4 |
| 데이터베이스 | Supabase PostgreSQL |
| 인증 및 데이터 접근 | Supabase Auth, RLS(Row Level Security) |
| 콘텐츠 에디터 | Tiptap v2 — 관리자 CMS |
| 결제 | TossPayments — 사용자 서비스 |

기존 FastAPI·MySQL·Docker 구성에서 Next.js API Routes와 Supabase 중심으로 이전한 구조입니다. 현재 실행 경로는 `admin`과 `user/user-front`입니다.

## 로컬 실행

Node.js와 npm, 각 애플리케이션에 연결할 Supabase 프로젝트가 필요합니다. 결제 기능을 확인하려면 토스페이먼츠 테스트 키도 준비합니다.

아래 명령은 **저장소 최상위 디렉터리**에서 시작합니다. 두 앱을 함께 사용할 때는 터미널을 각각 열어 실행합니다.

### 1. 관리자 CMS

```bash
cd admin
npm install
cp .env.local.example .env.local
```

`admin/.env.local`에 관리자용 Supabase 접속 정보를 입력합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-admin-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-admin-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-admin-service-role-key
```

```bash
npm run dev
```

접속 주소: http://localhost:3001

### 2. 사용자 서비스

별도 터미널에서 저장소 최상위 디렉터리를 기준으로 실행합니다.

```bash
cd user/user-front
npm install
cp .env.example .env.local
```

`user/user-front/.env.local`에 사용자용 Supabase 정보와 토스페이먼츠 키를 입력합니다. 기본 변수는 다음과 같으며, 추가 연결 설정은 `.env.example`을 참고합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-user-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-user-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-user-service-role-key

NEXT_PUBLIC_TOSS_CLIENT_KEY=your-toss-widget-client-key
TOSS_SECRET_KEY=your-toss-widget-secret-key
```

```bash
npm run dev
```

접속 주소: http://localhost:3000

환경 변수 파일은 각 앱 디렉터리에 두며, 실제 키가 들어 있는 `.env.local`은 Git에 커밋하지 않습니다. `SUPABASE_SERVICE_ROLE_KEY`와 `TOSS_SECRET_KEY`는 서버 전용 비밀 값입니다.

## 데이터베이스 설정

각 앱의 데이터베이스 설정 자료를 참고해 연결 대상 Supabase 프로젝트의 테이블과 RLS 정책을 준비합니다.

| 구분 | 주요 테이블 | 설정 자료 |
| --- | --- | --- |
| 관리자 | `document_nodes`, `reading_progress`, `tree_levels` | [관리자 테이블 및 RLS 설정](admin/README.md) |
| 사용자 | `users`, `products`, `orders`, `payments`, `rp_transactions`, `nodes`, `node_unlocks` | [사용자 초기 스키마](user/user-front/supabase_schema.sql) |

관리자 문서의 콘텐츠 테이블은 `document_nodes`, 사용자 초기 스키마의 노드 테이블은 `nodes`로 구분되어 있습니다. 신규 환경을 구성할 때는 각 앱의 Supabase 연결 설정과 실제 사용 테이블을 함께 확인합니다.

## 주요 API

아래 경로는 각 애플리케이션의 도메인 또는 로컬 주소를 기준으로 합니다.

| 애플리케이션 | 메서드 | 경로 | 역할 |
| --- | --- | --- | --- |
| 관리자 | `GET` | `/api/nodes` | 노드 목록 조회 |
| 관리자 | `GET` | `/api/nodes/:id` | 본문을 포함한 노드 상세 조회 |
| 관리자 | `GET` | `/api/progress?node_id=123` | 사용자별 읽기 진도 조회 |
| 관리자 | `POST` | `/api/progress` | 사용자별 읽기 진도 저장 |
| 사용자 | `POST` | `/api/payments/confirm` | 토스페이먼츠 결제 승인 |

관리자 읽기 진도 API는 `Authorization: Bearer <supabase_access_token>` 인증을 사용합니다. 요청·응답 예시는 [Admin README](admin/README.md)를 참고합니다.

## 결제 확인 흐름

1. 사용자 서비스에서 회원가입 후 로그인합니다.
2. `/checkout`에서 토스페이먼츠 테스트 결제를 진행합니다.
3. 결제 성공 후 `/api/payments/confirm`의 서버 승인 결과를 확인합니다.
4. 결제 기록, `rp_transactions` 내역 및 사용자 RP 잔액 반영 여부를 확인합니다.

## 빌드 및 배포

각 앱 디렉터리에서 개별적으로 빌드하고 실행합니다.

```bash
npm run build
npm run start
```

Vercel에 배포하는 경우 같은 저장소를 연결한 두 프로젝트로 구성하며, 앱별 Root Directory는 다음과 같습니다.

| 프로젝트 | Root Directory |
| --- | --- |
| 관리자 CMS | `admin` |
| 사용자 서비스 | `user/user-front` |

배포 환경 변수는 각 프로젝트에 별도로 등록합니다. 인증을 사용하는 배포 도메인은 Supabase 인증 설정에도 반영합니다.

## 상세 문서

- [관리자 CMS: 콘텐츠 관리, 데이터베이스 설정 및 API](admin/README.md)
- [사용자 서비스: 기능, 실행 및 결제 흐름](user/README.md)
- [사용자 앱: 개발 환경 및 인증 설정](user/user-front/README.md)
