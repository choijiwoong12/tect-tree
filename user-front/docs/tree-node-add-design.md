# 테크트리 노드 자동 추가 설계 메모

> 상태: **결정 보류 (논의용 초안)**
> 맥락: admin 페이지에서 노드를 추가하면 user 페이지에 **미열람(locked) leaf 노드**로 자동으로 나타나야 한다.
> 개발자가 아닌 운영자도 노드를 추가하므로, 코드 수정이 아니라 **서버 데이터 → 프론트 자동 반영** 구조가 필요하다.

---

## 0. 현재 코드 기준 (2026-06 기준)

- 트리 데이터는 프론트에 하드코딩되어 있음: `src/components/tree/treeGraph.ts`
  - `nodeSpecs`(노드) + `links`(부모→자식) + `computeRadialLayout`(위치 자동 계산)
  - 위치는 저장하지 않고 그래프 구조에서 **결정적(deterministic)** 으로 계산함.
- 엣지는 노드 중심↔중심으로 연결 (`DotNode`의 핸들을 중앙에 배치).
- 백엔드 타입은 이미 존재: `src/types/tree.ts`
  ```ts
  TreeNode { id, parent_id, title, summary, cost_rp, position_x, position_y, unlocked }
  TreeNodeDetail extends TreeNode { content }
  TreeEditEvent { event: "node.created" | "node.updated" | "node.deleted", node_id, data, actor_id }
  ```
  → **`position_x/y`(위치 저장 컬럼)** 와 **`TreeEditEvent`(실시간 이벤트)** 가 이미 스키마에 설계되어 있음.
- `src/lib/api.ts` : `api()` fetch 래퍼 (Bearer 토큰 자동 첨부).
- Supabase 클라이언트 존재: `src/lib/supabase/{client,server,admin}.ts`.

---

## 1. 핵심 결정 ①: 노드 위치를 "누가 / 언제" 계산하나

### 선택지 A — 서버에서 생성 시 1회 계산·저장 (현재 추천)
- admin이 `parent_id + title + cost_rp` 만 전송.
- 서버가 부모 위치를 기준으로 leaf 위치를 1회 계산 → `position_x/y` 에 저장.
- 프론트는 **렌더만** 함.
- 장점:
  - 모든 유저가 **동일한 트리** 를 봄.
  - **기존 노드는 절대 안 움직임** (신규 노드만 배치됨).
  - 이미 있는 `position_x/y` 컬럼 활용 → 스키마 변경 없음.
- 단점:
  - 위치 계산 알고리즘이 서버(파이썬)에 있어야 함. (프론트 TS 알고리즘과 별도 구현/이식)

### 선택지 B — 프론트에서 매번 계산
- 서버는 `parent_id` 만 저장, `position_x/y` 미사용.
- 프론트가 `computeRadialLayout` 으로 매 로드마다 계산.
- 단점:
  - 클라이언트마다 알고리즘이 같아야 함.
  - 매 로드 재계산.
  - **아래 "함정"(append 불안정)에 직접 노출** → 반드시 layout 수정 필요.

### 선택지 C — 하이브리드 (프론트 계산 → 서버 저장 write-back)
- 프론트 헬퍼가 위치를 계산해서 서버 `position_x/y` 에 저장.
- 한 번 계산되면 고정됨. 클라 단독으로도 가능하나 쓰기 권한 필요.

> **사용자 메모:** 결정 보류. 추후 결정.

---

## 2. 함정: 현재 layout 은 "leaf 추가 시 기존 형제가 움직임"

`computeRadialLayout` 은 형제를 **개수·인덱스 기반**으로 균등 분배함:
- 루트 자식: `angle = (2π·i)/n`
- 깊은 노드 자식: `angle = base + spread·(i/(n-1))`

→ 부모에 자식이 하나 늘어 `n` 이 바뀌면 **그 부모의 기존 자식 각도가 전부 재배치됨.**
→ "leaf 하나만 조용히 추가" 요구와 충돌.

### 해결 방향 (append-stable 만들기)
- 각도를 **자식 id 해시 기반**으로 변경:
  `childAngle = parentOutwardAngle + hashJitter(childId)`
- 즉 각 노드 위치가 **형제 수와 무관하게 자기 id 로만 결정** 되도록.
- 겹침(collision)은 삽입 시 기존 형제와 비교해 살짝 밀어서 회피.
- 이 수정은 **A/B/C 어느 방식이든 권장** (특히 B는 필수).

---

## 3. 핵심 결정 ②: status(열람 여부)는 전역이 아니라 per-user

- `TreeNode.unlocked` 는 공유 값이 아님. **요청한 유저 기준** 으로 서버가 내려줘야 함.
- 트리 "구조"(노드/링크) = 전역 / admin 소유.
- "열람 여부"(unlocked) = per-user (유저별 진행 상태 테이블).
- 신규 노드 = 기본 `locked` → user 페이지에서 `???` 미열람 leaf 로 표시.

---

## 4. 실시간 반영 채널 (admin 추가 → user 즉시 반영)

선택지:
- **Supabase Realtime** — 이미 Supabase 클라이언트가 있으니 테이블 변경 구독으로 바로 가능. `TreeEditEvent` 를 DB 변경 구독으로 대체/병행.
- **WebSocket / SSE (백엔드)** — FastAPI 백엔드에서 `TreeEditEvent` 를 푸시. `types/tree.ts` 의 `TreeEditEvent` 가 이 용도로 보임.
- **폴링 / 새로고침** — 실시간 불필요 시. 페이지 로드 시 또는 주기적으로 `GET /tree` 재조회. 가장 단순.

> **사용자 메모:** 선호 없음 (보류).

---

## 5. 권장 전체 흐름 (선택지 A 기준 예시)

```
admin → POST /admin/nodes { parent_id, title, cost_rp }
서버  → DB insert (+ position_x/y 계산·저장) → broadcast TreeEditEvent{ node.created, data }
user-front → 구독(Supabase Realtime / WS / SSE) → addLeafNode(data)
           → React 상태에 append → ??? (미열람) leaf 로 등장
```

### 프론트엔드에 만들 함수 (개념)
```ts
// 서버가 준 노드(위치 포함)를 받아 현재 트리 상태에 끼워넣기만 함
function addLeafNode(node: TreeNode) {
  // 1. nodes 상태에 { id, position:{position_x, position_y}, data:{ status:'locked', ... } } append
  // 2. links/edges 에 { source: parent_id, target: node.id } append (중심↔중심 직선)
  // 3. (B 방식이면 여기서 computeRadialLayout 재계산 — append-stable 필수)
}
```

---

## 6. TODO (결정 후 착수)

- [ ] 결정 ①: 위치 계산 위치 (A / B / C)
- [ ] 결정 ②: 실시간 채널 (Supabase Realtime / WS·SSE / 폴링)
- [ ] `treeGraph.ts` 하드코딩 데이터를 **서버 fetch(`GET /tree`)** 로 교체 (하드코딩은 fallback/seed 로 격하)
- [ ] `computeRadialLayout` 을 **append-stable(id 해시 기반)** 으로 수정
- [ ] `unlocked` 를 per-user 로 분리 (서버가 유저 기준 반환)
- [ ] 프론트 `addLeafNode` + 실시간 구독 구현
- [ ] (A/C면) 서버 측 위치 계산 로직 작성
