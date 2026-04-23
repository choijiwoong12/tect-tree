# ATHENA DOCTRINE TECH TREE — API 명세서

- Base URL: `http://localhost:8000`
- 모든 REST 엔드포인트 프리픽스: `/api`
- 인증: `Authorization: Bearer <access_token>` (JWT)
- 관리자 전용: JWT claim `role == "admin"`
- WebSocket: `ws://localhost:8000/ws/...`

---

## 1. Auth (`/api/auth`)

### POST `/api/auth/signup`
- Body: `{ "email": str, "password": str(>=8), "nickname": str }`
- 201: `UserOut`

### POST `/api/auth/login`
- Body: `{ "email": str, "password": str }`
- 200: `{ "access_token": str, "refresh_token": str, "token_type": "bearer" }`

### POST `/api/auth/refresh`
- Body: `{ "refresh_token": str }`
- 200: `{ "access_token": str, "token_type": "bearer" }`

### POST `/api/auth/logout`
- Auth: 필요
- Body: `{ "refresh_token": str }`
- 204

---

## 2. Users / MyPage (`/api/users`)

### GET `/api/users/me`
- Auth: 필요
- 200: `UserOut` — `{ id, email, nickname, role, rp_balance, profile_image_url, created_at }`

### PATCH `/api/users/me`
- Auth: 필요
- Body: `{ nickname?, profile_image_url? }`
- 200: `UserOut`

### POST `/api/users/me/password`
- Auth: 필요
- Body: `{ current_password, new_password }`
- 204

---

## 3. RP (`/api/rp`)

### GET `/api/rp/balance`
- Auth: 필요
- 200: `{ "balance": int }`

### GET `/api/rp/history?page=1&size=20`
- Auth: 필요
- 200: `{ items: RpTransactionOut[], total, page, size }`
- `kind ∈ { "charge", "unlock", "admin_adjust", "refund" }`

### POST `/api/rp/charge`
- Auth: 필요
- Body: `{ "amount_krw": int }`
- 200: `{ "order_id": str, "amount": int, "rp_amount": int }` — 이 `order_id`로 클라이언트에서 토스 결제창 호출

---

## 4. Payments (`/api/payments`)

### POST `/api/payments/toss/confirm`
- Auth: 필요
- 토스 SDK 성공 리다이렉트 후 클라이언트가 호출. 서버에서 Toss Approve API로 재검증 후 RP 지급.
- Body: `{ "payment_key": str, "order_id": str, "amount": int }`
- 200: `PaymentOut`
- 실패: 400 `payment verification failed`

### GET `/api/payments/history?page=1&size=20`
- Auth: 필요
- 200: `{ items: PaymentOut[], total, page, size }`

---

## 5. Nodes (`/api/nodes`) — 트리 열람

### GET `/api/nodes`
- Auth: 필요
- 200: `NodeOut[]` — 루트부터 모든 노드. 각 노드는 `unlocked: bool` 포함, 잠긴 노드는 `summary`만 보이고 `content`는 상세 API에서도 숨김.

### GET `/api/nodes/{node_id}`
- Auth: 필요
- 200: `NodeDetailOut` — 잠금해제된 경우만 `content` 필드가 채워짐

### POST `/api/nodes/{node_id}/unlock`
- Auth: 필요
- RP 잔액에서 `cost_rp`를 차감하고 `NodeUnlock` 레코드를 생성 (단일 트랜잭션).
- 200: `{ "node_id", "rp_spent", "rp_balance" }`
- 실패: 400 `insufficient RP balance` / 409 이미 해금됨

---

## 6. Admin (`/api/admin`) — 관리자 전용

모든 엔드포인트는 `role=admin` 필요.

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/admin/users?page&size&q` | 회원 검색 |
| PATCH | `/api/admin/users/{user_id}` | 권한 변경, RP 수동 조정 (`AdminUserUpdate`) |
| GET | `/api/admin/payments?page&size` | 전체 결제 내역 |
| GET | `/api/admin/nodes` | 편집용 전체 조회 (잠금 상관없이 `content` 포함) |
| POST | `/api/admin/nodes` | 노드 생성 → WS `node.created` 브로드캐스트 |
| PATCH | `/api/admin/nodes/{node_id}` | 노드 수정 → WS `node.updated` |
| DELETE | `/api/admin/nodes/{node_id}` | 노드 삭제 → WS `node.deleted` |

모든 쓰기 작업은 `admin_logs` 테이블에 감사 기록.

---

## 7. WebSocket

### `/ws/admin/tree-editor?token=<access_token>`
- 관리자만 접속. 토큰 검증 실패 시 1008 close.
- 서버 → 클라이언트 브로드캐스트 이벤트:

```json
{
  "event": "node.created" | "node.updated" | "node.deleted",
  "node_id": 42,
  "data": { "title": "...", "parent_id": 1, "cost_rp": 100 },
  "actor_id": 7
}
```

- 현재는 서버→클라이언트 단방향 브로드캐스트. 클라이언트에서 오는 메시지는 무시(연결 유지용).

---

## 8. 에러 포맷

모든 에러 응답:

```json
{ "detail": "human-readable message" }
```

주요 에러 코드:

| 코드 | 상황 |
|---|---|
| 400 | 유효성 실패, RP 부족, 결제 검증 실패 |
| 401 | 토큰 없음·만료·무효 |
| 403 | 권한 부족 (잠긴 노드 접근, 관리자 권한 없음) |
| 404 | 리소스 없음 |
| 409 | 중복 (이미 해금된 노드, 중복 order_id) |

---

## 9. 결제 흐름 요약

1. 사용자가 `/api/rp/charge`로 주문 생성 → `order_id` 수령
2. 클라이언트가 토스 SDK로 결제창 호출 (`clientKey` + `order_id` + 금액)
3. 결제 성공 리다이렉트 → 클라이언트가 `/api/payments/toss/confirm` 호출
4. 서버가 토스 Approve API로 재검증하고 금액 일치 시 `Payment.status = "paid"` + `rp_service.apply_rp_delta(+rp_amount, kind="charge", reference_id=order_id)`
5. 실패 시 `Payment.status = "failed"`, RP 미지급

---

## 10. 도메인 모델 요약

- `User(id, email, password_hash, nickname, role, rp_balance, profile_image_url, ...)`
- `Payment(id, user_id, order_id, toss_payment_key, amount, rp_amount, status, ...)`
- `RpTransaction(id, user_id, delta, balance_after, kind, reference_id, memo, created_at)` — 증감 원장
- `Node(id, parent_id, title, summary, content, cost_rp, position_x, position_y, ...)`
- `NodeUnlock(id, user_id, node_id, rp_spent, unlocked_at)` — `(user_id, node_id)` UNIQUE
- `AdminLog(id, admin_id, action, target_type, target_id, payload_json, created_at)`
