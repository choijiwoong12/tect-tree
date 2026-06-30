# Node Admin

테크 트리 기반 학습 콘텐츠 관리 시스템 (Admin CMS).  
그래프 뷰에서 노드를 배치하고, 각 노드에 리치 텍스트 콘텐츠와 목차를 관리합니다.  
유저 앱에서 소비할 수 있는 REST API를 내장하고 있습니다.

---

## 기술 스택

- **Next.js 14** (App Router)
- **Supabase** — DB, Auth, RLS
- **Tiptap v2** — 리치 텍스트 에디터
- **Tailwind CSS**, **clsx**, **lucide-react**
- **TypeScript**

---

## 시작하기

```bash
npm install
cp .env.local.example .env.local  # 환경변수 설정
npm run dev                        # http://localhost:3001
```

### 환경변수 (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # API 라우트용
```

---

## Supabase 테이블 설정

### 1. `document_nodes`

```sql
CREATE TABLE document_nodes (
  id           BIGSERIAL PRIMARY KEY,
  parent_id    INTEGER REFERENCES document_nodes(id) ON DELETE SET NULL,
  title        TEXT NOT NULL DEFAULT '',
  node_kind    TEXT NOT NULL DEFAULT 'content',  -- category | content | file
  body_content TEXT,
  index_items  JSONB DEFAULT NULL,               -- H1 헤딩 자동 추출값
  file_name    TEXT,
  file_path    TEXT,
  is_locked    BOOLEAN NOT NULL DEFAULT FALSE,
  price        INTEGER DEFAULT NULL,
  pos_x        FLOAT DEFAULT 0,
  pos_y        FLOAT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 공개 읽기 허용 (유저 앱용)
ALTER TABLE document_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read nodes" ON document_nodes FOR SELECT USING (true);
```

### 2. `reading_progress`

```sql
CREATE TABLE reading_progress (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  node_id    INTEGER NOT NULL REFERENCES document_nodes(id) ON DELETE CASCADE,
  read_items TEXT[],                             -- 읽은 목차 id 배열: ["h1-0", "h1-1"]
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, node_id)
);

ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress" ON reading_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3. `tree_levels`

각 레벨은 독립된 타원(중심 좌표 + 가로/세로 반경)으로 정의되는 바운더리입니다. 노드 레코드에는 레벨이 저장되지 않고, 노드가 어느 레벨 타원에 가장 가까운지(정규화 거리 최소)를 항상 실시간 계산합니다 — 바운더리를 옮기거나 크기를 바꾸면 노드 소속도 즉시 바뀝니다.

```sql
CREATE TABLE tree_levels (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT '',
  center_x   FLOAT NOT NULL DEFAULT 0,
  center_y   FLOAT NOT NULL DEFAULT 0,
  radius_x   FLOAT NOT NULL DEFAULT 100,  -- 가로 반경
  radius_y   FLOAT NOT NULL DEFAULT 100,  -- 세로 반경
  color      TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tree_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read levels" ON tree_levels FOR SELECT USING (true);
CREATE POLICY "authenticated write levels" ON tree_levels FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

레벨끼리 중첩/순서 개념은 없습니다. 노드는 모든 레벨 타원 중 `((x-center_x)/radius_x)² + ((y-center_y)/radius_y)²` 값이 가장 작은(가장 안쪽/가까운) 레벨에 속하는 것으로 계산됩니다.

---

## 주요 기능

### 노드 관리 (그래프 뷰)
- SVG 기반 캔버스에서 노드 트리를 시각화
- 3단계 생성 플로우: 부모 선택 → 위치 클릭 → 내용 편집
- 노드 검색 (제목 기준) → 해당 노드 중앙 이동

### 노드 에디터
- **기본 정보**: 제목, 종류(카테고리/문서/파일), 부모 노드, 잠금/가격
- **위치 설정**: 그래프 좌표 (부모 기준 오프셋)
- **목차 항목**: 에디터에서 H1 헤딩 작성 시 자동 추출되어 표시
- **내용 에디터**: Tiptap 리치 에디터 (폰트 크기, Bold/Italic/Underline, H1, 목록, 정렬, 구분선, 실행취소)

### 목차 자동 연동
에디터에서 **H1 제목**을 작성하면 `index_items` 필드에 자동으로 저장됩니다.

```json
[
  { "id": "h1-0", "title": "첫 번째 섹션" },
  { "id": "h1-1", "title": "두 번째 섹션" }
]
```

유저 앱에서 각 H1 태그에 `id="h1-0"` 형태로 anchor를 부여하면, `reading_progress`와 연동해 읽기 진도를 추적할 수 있습니다.

---

## REST API (유저 앱용)

모든 엔드포인트는 CORS를 허용합니다.

### 노드 조회

```
GET /api/nodes
```
전체 노드 트리 반환 (body_content 제외). 유저 앱 네비게이션용.

```
GET /api/nodes/:id
```
단건 노드 반환 (body_content 포함). 콘텐츠 페이지 렌더링용.

### 읽기 진도

인증 필요: `Authorization: Bearer <supabase_access_token>`

```
GET /api/progress?node_id=123
```
해당 노드의 읽기 진도 반환.

```json
{ "read_items": ["h1-0"], "updated_at": "2026-06-26T..." }
```

```
POST /api/progress
Content-Type: application/json

{ "node_id": 123, "read_items": ["h1-0", "h1-1"] }
```
진도 upsert. 유저가 H1 섹션을 읽을 때마다 호출.

---

## 유저 앱 연동 예시

```ts
// 1. 노드 콘텐츠 가져오기
const node = await fetch('/api/nodes/123').then(r => r.json());

// 2. body_content 렌더링 시 H1에 anchor 부여
// <h1 id="h1-0">첫 번째 섹션</h1>

// 3. IntersectionObserver로 읽음 감지
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id; // "h1-0"
      // POST /api/progress with updated read_items
    }
  });
});
document.querySelectorAll('h1[id]').forEach(el => observer.observe(el));

// 4. 진도율 계산
const progress = readItems.length / node.index_items.length; // 0.0 ~ 1.0
```

---

## 디렉토리 구조

```
src/
├── app/
│   ├── api/
│   │   ├── nodes/
│   │   │   ├── route.ts          # GET /api/nodes
│   │   │   └── [id]/route.ts     # GET /api/nodes/:id
│   │   └── progress/
│   │       └── route.ts          # GET & POST /api/progress
│   ├── page.tsx                  # Admin 메인 페이지
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── NodeGraphManager.tsx      # 그래프 기반 노드 관리 탭
│   ├── NodeDetail.tsx            # 노드 편집 전체 페이지
│   ├── RichEditor.tsx            # Tiptap 에디터
│   ├── GraphView.tsx             # 그래프 뷰 탭 (읽기 전용)
│   ├── Dashboard.tsx             # 대시보드
│   ├── NodePositionPicker.tsx    # 노드 위치 재설정 오버레이
│   ├── Sidebar.tsx               # 사이드 네비게이션
│   └── LoginPage.tsx             # Google OAuth 로그인
└── lib/
    ├── supabase.ts               # 클라이언트 Supabase + CRUD 함수
    ├── supabase-server.ts        # 서버사이드 Supabase 클라이언트
    ├── types.ts                  # TypeScript 타입 정의
    └── utils.ts                  # 유틸리티 함수
```
