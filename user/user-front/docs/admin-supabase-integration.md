# 어드민 Supabase ↔ user-front 트리 연동 계획

목적: 어드민이 저장·지정한 **노드 데이터/위치**를 바탕으로, user-front가 **유저별 해금현황 + 개인 알고리즘**으로 "유저마다 다른 트리"를 렌더.
원칙: 코드 수정 전 계획·입력값 합의 → 단계별 진행.

## 결정사항 (2026-06-22)
- 노드용 **신규 DB 안 만듦** → **기존 어드민 Supabase의 `nodes`** 사용(노드 데이터·위치는 어드민이 저장/지정).
- user-front 프로젝트에 **유저별 노드 해금현황** 저장(신규 테이블).
- **개인화 v1 = 계정(구글 로그인)별 해금현황 차등**. 전 노드 모두 표시(숨김 없음), 상태는 **해금 / 잠금(???)** 2가지. 잠금 노드 클릭 → 언락 모달.
  - 직업군·프로필·RP로 노드를 **숨기는 필터**는 선택적 후속(v1 불필요).
- 중앙 **마이페이지 노드는 별도**(어드민 노드 아님) — 항상 존재, 클릭 → 마이페이지.
- 노드 **해금 비용(RP)도 어드민에서 제공** → 언락 모달에 표시 + 보유 RP와 비교.
- content 접근 = **해금한 유저만**.
- **Supabase-only 연동(확정)**: 어드민↔user-front는 **Supabase로만** 연결. **FastAPI(`back/`, `api.ts`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`)는 전부 삭제.** 노드는 어드민 Supabase `document_nodes` 직접 read + **Supabase Realtime**으로 편집 실시간 반영. `TreeNode` 타입은 `document_nodes` 컬럼(`node_kind`/`body_content`/`pos_x/y`/`price`)에 맞게 확장해 재사용. **`TreeEditEvent` 유지** — 어드민이 같은 그래프에서 노드 위치 등 편집 시 Supabase Realtime 이벤트로 **즉시 반영**.

## 1. 토폴로지 (두 개의 기존 Supabase)

```
┌─ 어드민 Supabase (기존) ───────────┐     ┌─ user-front Supabase (기존) ───────┐
│  nodes  ← 어드민이 저장/위치지정    │     │  users (rp_balance, 콜사인/프로필)  │
│   (id, parent_id, title, summary,  │     │  rp_transactions                   │
│    content, cost_rp,               │     │  user_node_unlocks   ← 신규         │
│    position_x/y, theme_id ...)     │     │  products/orders/payments          │
└──────────┬──────────────────────────┘     └──────────┬─────────────────────────┘
           │ (A) 노드 카탈로그 읽기                     │ (B) 해금현황·프로필 읽기
           │     anon, content 제외                     │     세션 RLS
           └───────────────┬───────────────────────────┘
                           ▼
              개인 알고리즘 personalize()  →  유저별 트리(노드 집합·상태)  →  ReactFlow
                           ▲                                   (좌표 = 어드민 position_x/y)
                           │ (C) 해금/본문은 서버(Next API) 경유
```

- 크로스 프로젝트 FK 불가 → `user_node_unlocks.node_id`는 plain bigint(논리 참조).
- content 게이팅은 한쪽 RLS로 불가 → user-front(해금여부) + 어드민(content)을 **Next API Route**에서 합쳐 안전 처리.

## 1.1 실제 어드민 스키마: `document_nodes` (확인됨)

| 컬럼 | 타입 | 플랜 매핑 / 비고 |
|---|---|---|
| `id` | int8 | PK |
| `parent_id` | int8 null | 엣지(부모→자식) |
| `title` | text | 노드명 |
| `node_kind` | text | 노드 종류(루트/카테고리/문서?) — 값 종류 확인 필요 |
| `body_content` | text null | 본문 (= 기존 plan의 content). 해금 게이팅 대상 |
| `file_name` / `file_path` | text null | 첨부 파일? 문서 렌더 방식 확인 필요 |
| `is_locked` | bool | 노드 자체 잠금(어드민 기본값) — 유저별 해금과 별개 |
| `pos_x` / `pos_y` | float8 null | **어드민 지정 좌표** (null이면 폴백 레이아웃) |
| `price` | int4 | **해금 비용(RP)** — 언락 모달 필요 RP |
| `created_at` / `updated_at` | timestamptz | |

**샘플로 확인된 사실 (6행)**
- **비용 = `price`** ✅ (예: 50 / 300 / 1000 / 5000 / 10000).
- **포레스트(루트 다수)**: `parent_id=null`이 2개(id 5, 7). 단일 루트 아님 → `ROOT_ID` 고정 가정 폐기, 다중 루트 처리.
- **좌표계**: 원점 0,0 부근 ±수백(x −498~284, y −169~50, 소수 허용). → **ReactFlow 좌표로 거의 직접 매핑**(배율 K≈1, 시각 보정만). y는 화면좌표(아래 +) 가정 — 세로가 뒤집히면 부호 반전.
- **`node_kind`='content'**(전부), **`body_content`=HTML**(`<p>…</p>`) → DocumentViewer가 HTML 렌더. `file_name/path`=null(미사용).
- **`is_locked`=false**(전부) — 해금 게이트는 `user_node_unlocks`(+`price`)로 처리. `is_locked=true`는 어드민 강제잠금/미공개로 해석(확인).

## 2. 환경변수 (추가)

| 키 | 용도 | 노출 |
|---|---|---|
| `NEXT_PUBLIC_ADMIN_SUPABASE_URL` | 어드민 프로젝트 | 공개 |
| `NEXT_PUBLIC_ADMIN_SUPABASE_ANON_KEY` | 노드 카탈로그 읽기(content 제외) | 공개 |
| `ADMIN_SUPABASE_SERVICE_ROLE_KEY` | 서버에서 cost·content 읽기 | **서버 전용** |

## 3. DB 작업 (Phase 0)

### 어드민 Supabase (어드민 측 협조)
- `nodes`에 anon 읽기 허용하되 **`content` 제외**: 뷰 `nodes_public`(content 빼고) + anon SELECT 권장. content는 service role로만.
- ⚠️ 어드민 프로젝트 RLS를 우리가 못 바꾸면 위 설정을 어드민 담당자에게 요청.

### user-front Supabase
- `user_node_unlocks(user_id uuid FK users, node_id bigint, unlocked_at timestamptz, PK(user_id,node_id))` + RLS(본인만).
- 현재 해금은 [TreeCanvas.tsx:85](../src/components/tree/TreeCanvas.tsx#L85)에서 **클라 메모리만**(새로고침 소실) → 영속화.

## 4. 읽기 경로 (Phase 1)

1. **어드민 클라이언트** `src/lib/supabase/nodes-client.ts` (anon, 어드민 프로젝트).
2. **쿼리** `src/lib/tree/queries.ts`:
   - `fetchNodeCatalog(themeId)` → 어드민 `nodes_public` (전체 노드 풀)
   - `fetchUnlocks(userId)` → user-front `user_node_unlocks`
   - (필요 시) 프로필/콜사인은 기존 `users`에서.

## 5. 개인화 = 계정별 해금 오버레이 (Phase 1.5)

핵심: **유저마다 다른 트리 = 구글 계정별 해금현황 차이**. 별도 "필터 알고리즘" 없이 성립(각 계정 = 각자의 `user_node_unlocks`).

`src/lib/tree/mapToFlow.ts`:
```
build(catalog, unlocks) → { nodes, edges }
```
- **전 노드 표시**(숨김 없음). 좌표 = 어드민 `pos_x/pos_y` 그대로.
- 노드 status는 **2가지**:
  - `unlocked`: `user_node_unlocks`에 있음(§7) → 클릭 시 본문
  - `locked`(`???`): 그 외 → 클릭 시 언락 모달(어드민 비용 vs 보유 RP)
- **중앙 마이페이지 노드**: 어드민 노드 풀과 별개의 고정 노드. 항상 중앙, 클릭 → 마이페이지.

> 직업군·프로필·RP로 **노드를 숨기거나 큐레이션**하려면 그때 `personalize(signals)` 필터를 추가(선택적 후속). v1엔 불필요.

이후 **매퍼** `src/lib/tree/mapToFlow.ts`:
- ReactFlow `nodes`: `position: worldToFlow(position_x, position_y)` ← **computeRadialLayout 대체**
- `worldToFlow(x,y)={x:(x-originX)*scale, y:(y-originY)*scale}` — 어드민 좌표계가 ReactFlow와 1:1 아닐 수 있어 **1회 보정**(샘플 캘리브레이션). null만 `computeRadialLayout` 폴백.
- ReactFlow `edges`: `parent_id` → `{source,target}`

**TreeCanvas 배선**: 정적 `initialNodes` 제거 → personalize 결과 사용. 비로그인 `???` 처리 유지.

## 6. 해금 + 본문 (Phase 2) — 서버 경유

- `POST /api/nodes/[id]/unlock`: ① 세션 확인 ② 어드민(service role)에서 `cost_rp`·`content` 읽기(클라가 cost 못 속임) ③ user-front RPC `unlock_node(p_node_id,p_cost)`(원자적: 잔액확인→RP차감→`rp_transactions`→`user_node_unlocks`) ④ `content` 반환 → `DocumentViewer`.
- `GET /api/nodes/[id]/content`: 해금 확인 후 content 반환(재열람).
- [TreeCanvas.tsx:85](../src/components/tree/TreeCanvas.tsx#L85) `handleUnlock` → 위 API로 교체, 성공 시 `refreshUser()`.

## 7. status 도출 (2상태)
- `unlocked`: `user_node_unlocks`에 존재 (+ `is_locked=false`면 기본 공개로 볼지 — 의미 확인).
- `locked`(`???`): 그 외. 클릭 → 언락 모달에 **어드민 제공 비용** 표시 + 보유 RP 비교(부족=Frame13 / 충분=Frame14).
> 기존 코드의 3번째 상태 `unlockable`은 제거(2상태로 단순화).

## 8. 진행에 필요한 입력 (블로킹)
1. ✅ DDL 받음(`document_nodes`, §1.1) — 단 **갭 확인 필요**: **비용 컬럼 추가**(어드민 제공 예정인데 표에 없음), 단일 트리 여부, `is_locked` 의미, `pos_x/y` 좌표계(샘플 몇 행).
2. ~~필터 규칙~~ → **v1 불필요**(계정별 해금 오버레이로 충분). 직업군/프로필 큐레이션은 후속 옵션.
3. **어드민 프로젝트 접근**: anon/service role 키 + RLS 변경 가능 여부(아니면 content 제외 뷰·anon 읽기 요청).
4. ✅ **노드 연결 = Supabase 직접 (확정)**: 어드민 Supabase `document_nodes` 직접 read + Supabase Realtime. FastAPI(`back/`) 경유 안 함 → `api.ts`/API_URL/WS_URL 삭제. (`TreeEditEvent`는 Realtime 이벤트 타입으로 **유지**)

## 9. 후속 (Phase 3)
- **Realtime**: **Supabase Realtime**으로 어드민 `document_nodes` 변경(INSERT/UPDATE/DELETE) 구독 → 트리 실시간 반영.
- **FastAPI 제거(완료)**: `src/lib/api.ts`, `.env`의 `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL`, `src/types/api.ts`의 `back/app` sync 주석, 미사용 `NodeCard.tsx` 삭제됨. `TreeNode`/`TreeNodeDetail`/**`TreeEditEvent` 유지**(TreeEditEvent = 어드민 노드 편집을 Supabase Realtime으로 즉시 반영하는 이벤트 타입).
- `/tree/node/[id]` 스텁 처리 · 미사용 `NodeCard` 정리.

## 10. 구현 설계 (파일·시그니처)

### 파일 구조 (신규/수정)
```
src/lib/supabase/admin-nodes.ts        // anon 클라이언트 → 어드민 프로젝트 (document_nodes 읽기)
src/lib/tree/types.ts                  // DocumentNode(테이블) · TreeNodeView(렌더)
src/lib/tree/queries.ts                // fetchCatalog(), fetchUnlocks(userId)
src/lib/tree/buildTree.ts              // build(catalog, unlockedIds) → {nodes, edges}
src/app/api/nodes/[id]/unlock/route.ts // 서버 해금(어드민 price·content + user-front RP/기록)
src/components/tree/TreeCanvas.tsx      // 정적 nodeSpecs/computeRadialLayout 제거 → build() 사용
db/user-front: user_node_unlocks 테이블 + unlock_node() RPC (마이그레이션)
```

### 타입
```ts
interface DocumentNode {        // = document_nodes
  id: number; parent_id: number | null; title: string; node_kind: string
  body_content: string | null; file_name: string | null; file_path: string | null
  is_locked: boolean; pos_x: number | null; pos_y: number | null; price: number
}
type NodeStatus = 'unlocked' | 'locked'
```

### 좌표 변환
```ts
const K = 1               // 시각 보정 배율 (라벨 겹치면 1.5~2로)
const toFlow = (n: DocumentNode) => ({ x: (n.pos_x ?? 0) * K, y: (n.pos_y ?? 0) * K })
// 원점 0,0 그대로 / 세로 뒤집히면 y에 -1
```

### build()
```ts
build(catalog, unlockedIds: Set<number>) → {
  nodes: [
    centerNode,                     // 마이페이지 노드: id 'me', position {0,0}, 고정
    ...catalog.map(n => ({
      id: String(n.id), type: 'dot', position: toFlow(n),
      data: { label: n.title, status: unlockedIds.has(n.id) ? 'unlocked':'locked', price: n.price }
    }))
  ],
  edges: catalog.filter(n => n.parent_id != null)
    .map(n => ({ id:`e${n.parent_id}-${n.id}`, source:String(n.parent_id), target:String(n.id) }))
  // (옵션) 루트(parent_id=null)들 ↔ 'me' 엣지 — 별자리 느낌 줄지 확인
}
```
- locked 노드는 라벨 `???` 마스킹(기존 TreeCanvas 로직 재사용). 클릭 → 언락 모달(`price` vs 보유 RP).

### 해금 (서버)
```
POST /api/nodes/[id]/unlock
 1) 세션 유저
 2) 어드민(service role): select price, body_content from document_nodes where id
 3) user-front RPC unlock_node(p_node_id, p_price):
      already? → ok | rp_balance < price → 402 | else 차감+rp_transactions+user_node_unlocks (원자적)
 4) return { body_content } → DocumentViewer
GET /api/nodes/[id]/content  // 재열람: 해금 확인 후 어드민 content 반환
```

### user-front 마이그레이션
```sql
create table user_node_unlocks (
  user_id uuid references public.users(id) on delete cascade,
  node_id bigint not null,
  unlocked_at timestamptz default now() not null,
  primary key (user_id, node_id)
);
-- RLS: 본인 select/insert
-- unlock_node(p_node_id bigint, p_price int) returns void, security definer (잔액확인→차감→기록 원자적)
```
