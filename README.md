# ATHENA DOCTRINE TECH TREE

> **프로젝트명**: ATHENA DOCTRINE TECH TREE  
> **문서 작성일**: 2026-05-04  
> **작업 기간**: 2026-05-04 ~ 2026-06-01 (4주)  
> **현재 상태**: 스켈레톤 코드 완성 (서비스 로직 미구현)  

---

## 1. 프로젝트 개요

### 1.1 서비스 설명
문서를 노드 형태로 구성한 테크트리 열람 서비스. 사용자는 RP(포인트)를 충전하고 노드를 해금하여 콘텐츠를 열람한다. 관리자는 실시간 WebSocket 기반 트리 편집기를 통해 노드를 관리한다.

### 1.2 핵심 기능
| # | 기능 | 설명 |
|---|---|---|
| F1 | 회원 인증 | 이메일 기반 회원가입/로그인, JWT 인증, 리프레시 토큰 |
| F2 | 마이페이지 | 프로필 수정, 비밀번호 변경, RP 잔액/내역 확인 |
| F3 | RP 시스템 | 토스페이먼츠 결제 → RP 충전, RP 증감 원장 관리 |
| F4 | 트리 열람 | 전체 트리 시각화, 노드 해금(RP 차감), 콘텐츠 열람 |
| F5 | 관리자 | 회원 관리, 결제 내역, 노드 CRUD, 실시간 트리 편집기(WS) |

---

## 2. 현재 진행 상황

### 2.1 완료 (스켈레톤)
- [o] 프로젝트 구조 및 Docker Compose 환경
- [o] DB 모델 6개 (User, Node, NodeUnlock, Payment, RpTransaction, AdminLog)
- [o] Pydantic 스키마 전체
- [o] FastAPI 라우터 7개 (auth, users, rp, payments, nodes, admin, ws)
- [o] Core 모듈 (JWT/bcrypt, 예외 클래스, WebSocket 매니저)
- [o] 토스페이먼츠 API 클라이언트
- [o] 프론트엔드 타입, API 클라이언트, Auth/WS 훅
- [o] Next.js 라우팅 구조 및 컴포넌트 파일 생성

### 2.2 미구현
- [ ] 백엔드 서비스 로직 전체 (18개 함수, 모두 `NotImplementedError`)
- [ ] `get_current_user` 의존성 함수
- [ ] Alembic 마이그레이션 스크립트
- [ ] 프론트엔드 UI 컴포넌트 전체 (placeholder 상태)
- [ ] 프론트엔드 페이지 구현
- [ ] 테스트 코드
- [ ] 배포 설정

---

## 3. 주차별 작업 계획

### WEEK 1 — 백엔드 핵심 구현

> 목표: 인증 + 사용자 + RP 서비스 완성, DB 마이그레이션 확정

| 작업 | 산출물 |
|---|---|
| Alembic 초기 마이그레이션 생성 및 적용 | `alembic/versions/001_*.py` |
| `get_current_user` 의존성 구현 | `dependencies.py` |
| `auth_service` 구현 (signup, login, refresh, logout) | `services/auth_service.py` |
| `user_service` 구현 (get_me, update_me, change_password) | `services/user_service.py` |
| `rp_service` 구현 (balance, history, charge, apply_delta) | `services/rp_service.py` |
| Auth/User/RP 단위 테스트 작성 | `tests/test_auth.py` 등 |

**마일스톤 M1**: 회원가입 → 로그인 → 토큰 갱신 → 프로필 조회/수정 → RP 잔액 확인 API 정상 동작

---

### WEEK 2 — 결제 + 노드 + 관리자 백엔드 → MVP 완성 시점

> 목표: 전체 백엔드 API 구현 완료

| 작업 | 산출물 |
|---|---|
| PG사 인증 (사업자 등록, API 키 발급, 샌드박스 설정) | `.env` 키 설정 |
| `payment_service` 구현 (confirm_toss, history) | `services/payment_service.py` |
| `node_service` 구현 (list_tree, get_node, unlock) | `services/node_service.py` |
| `admin_service` 구현 (users CRUD, nodes CRUD, WS broadcast) | `services/admin_service.py` |
| Admin 라우터 `list_nodes` 구현 | `routers/admin.py` |
| 결제/노드/관리자 단위 테스트 | `tests/test_payment.py` 등 |

**마일스톤 M2**: Swagger(/docs)에서 전체 API 테스트 통과. 토스 결제 플로우 샌드박스 검증 완료.

---

### WEEK 3 — 프론트엔드 구현

> 목표: 핵심 UI 전체 구현 및 백엔드 연동

| 작업 | 산출물 |
|---|---|
| 글로벌 CSS 디자인 시스템 구축 | `globals.css` |
| 공통 컴포넌트 (Button, Modal, Toast) 구현 | `components/common/*` |
| 로그인/회원가입 페이지 구현 | `LoginForm`, `SignupForm`, 페이지 |
| 마이페이지 (프로필, RP 내역, 결제 내역) | `mypage/*` |
| 트리 열람 페이지 (TreeCanvas, NodeCard, UnlockModal) | `tree/*`, `components/tree/*` |
| RP 충전 → 토스 결제 연동 (클라이언트 SDK) | 결제 플로우 |

**마일스톤 M3**: 사용자 플로우 E2E — 회원가입 → 로그인 → RP 충전 → 노드 해금 → 콘텐츠 열람

---

### WEEK 4 — 관리자 UI + 통합 테스트 + 마무리

> 목표: 관리자 페이지 완성, 전체 QA, 배포 준비

| 작업 | 산출물 |
|---|---|
| 관리자 대시보드/레이아웃 | `admin/layout.tsx`, `admin/page.tsx` |
| 관리자 회원 관리 (UserTable) | `admin/users/*` |
| 관리자 결제 내역 (PaymentTable) | `admin/payments/*` |
| 관리자 트리 편집기 (TreeEditor + WS 연동) | `admin/tree-editor/*` |
| E2E 통합 테스트 | `tests/e2e/*` |
| 버그 수정 및 UI 폴리싱 | — |
| 배포 설정 및 문서 정리 | `README.md`, 배포 스크립트 |

**마일스톤 M4**: 전체 서비스 동작 확인. Docker Compose로 원커맨드 실행 가능.

---

## 4. 기술 스택 변경 가능성 (회의 검토 사항)

> 현재 스켈레톤은 1인 작업으로 선정한 스택입니다.
> 팀 회의를 통해 아래 항목들의 변경을 검토해야 합니다.

### 4.1 변경 가능성 높음 🔴

| 현재 선택 | 대안 | 검토 포인트 |
|---|---|---|
| **MySQL 8.0** | PostgreSQL 15+ | PostgreSQL이 JSON 타입, 전문검색, 확장성에서 유리. 팀 내 DB 경험에 따라 결정 |
| **TailwindCSS 4** | Vanilla CSS / CSS Modules | 기본 채택. 개발 속도·디자인 일관성에서 유리. 대안은 의존성 최소화 시 검토 |
| **localStorage 토큰 저장** | httpOnly Cookie | 보안 강화(XSS 방지). 서버 측 쿠키 설정 필요, CORS 정책 조정 |
| **In-memory WS Manager** | Redis Pub/Sub | 다중 서버 인스턴스 배포 시 필수. 단일 서버면 현재 방식 유지 가능 |

### 4.2 변경 가능성 중간 🟡

| 현재 선택 | 대안 | 검토 포인트 |
|---|---|---|
| **토스페이먼츠** | 포트원(구 아임포트) / 카카오페이 | 결제 수단 다양성, SDK 편의성, 수수료율 비교 필요 |

### 4.3 변경 가능성 낮음 🟢

| 현재 선택 | 비고 |
|---|---|
| **FastAPI** | Python 비동기 웹 프레임워크로 최적. 변경 불필요 |
| **SQLAlchemy 2.0** | Python ORM 표준. Mapped 타입 이미 적용 완료 |
| **Alembic** | SQLAlchemy 전용 마이그레이션. 대안 없음 |
| **Pydantic v2** | FastAPI 필수 의존성. 변경 불가 |
| **Docker Compose** | 로컬 개발 환경 표준. 변경 불필요 |
| **TypeScript** | 프론트엔드 타입 안전성. 변경 불필요 |

### 4.4 추가 도입 검토 도구

| 도구 | 용도 | 도입 시기 |
|---|---|---|
| **Zustand / Jotai** | 프론트엔드 전역 상태 관리 (현재 store/ 비어있음) | Week 3 |
| **React Query (TanStack Query)** | 서버 상태 캐싱, 자동 갱신 | Week 3 |
| **react-flow / d3.js** | 트리 캔버스 시각화 라이브러리 | Week 3 (트리 페이지) |
| **Sentry** | 에러 모니터링 | Week 4 |
| **GitHub Actions** | CI/CD 파이프라인 | Week 4 |
| **Nginx** | 리버스 프록시, 정적 파일 서빙 | 배포 시 |

---

## 5. 리스크 및 대응 방안

| 리스크 | 영향도 | 대응 |
|---|---|---|
| 토스 결제 연동 지연 | 높음 | 샌드박스 환경에서 Week 2 초에 우선 검증. Mock 서버 준비 |
| 트리 시각화 복잡도 | 높음 | 라이브러리(react-flow 등) 조기 PoC 진행 |
| DB 스키마 변경 | 중간 | Alembic 마이그레이션으로 관리. 모델 변경 시 즉시 반영 |
| 프론트엔드 디자인 미확정 | 중간 | Week 3 시작 전 디자인 확정 필요. 최소 와이어프레임 준비 |
| 1인 개발 병목 | 높음 | 주차별 마일스톤 단위로 검증. 스코프 축소 옵션 준비 |

---

## 6. 회의 안건 (킥오프)

1. **DB 선택**: MySQL vs PostgreSQL
2. **결제 PG사 확정**: 토스페이먼츠 유지 여부
3. **트리 시각화 라이브러리** 선정
4. **상태 관리** 라이브러리 선정
5. **디자이너 참여 여부**, 와이어프레임/시안 일정
6. **배포 환경**: 클라우드 서비스 선정 (AWS / GCP / Vercel+Railway 등)
7. **도메인/SSL**: 도메인 구매 및 HTTPS 설정

---

## 7. 디렉토리 구조 (현재)

```
tect-tree-project/
├── docker-compose.yml
├── PROJECT_PLAN.md
├── tect-tree-back/
│   ├── app/
│   │   ├── main.py, config.py, database.py, dependencies.py
│   │   ├── core/        (security, exceptions, ws_manager)
│   │   ├── models/      (6개 — 완성)
│   │   ├── schemas/     (6개 — 완성)
│   │   ├── routers/     (7개 — 라우팅만 완성)
│   │   ├── services/    (6개 — 전부 미구현)
│   │   └── utils/       (toss_client — 완성)
│   ├── alembic/
│   ├── tests/
│   └── docs/            (API_SPEC.md)
└── tect-tree-front/
    ├── postcss.config.mjs   (TailwindCSS v4)
    └── src/
        ├── app/         (라우팅 구조 — placeholder, Tailwind 적용)
        ├── components/  (4개 디렉토리 — placeholder)
        ├── hooks/       (useAuth, useTreeSocket — 완성)
        ├── lib/         (api, auth, ws — 완성)
        ├── store/       (비어있음)
        └── types/       (api, tree — 완성)
```

---

*본 문서는 팀 회의 결과에 따라 수정될 수 있습니다.*
