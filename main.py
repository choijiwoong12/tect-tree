import os
import json
import shutil
from html import escape
from pathlib import Path
from typing import Any
from uuid import uuid4

from authlib.integrations.starlette_client import OAuth, OAuthError
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, create_engine, text
from sqlalchemy.orm import Mapped, Session, declarative_base, mapped_column, relationship, sessionmaker
from starlette.middleware.sessions import SessionMiddleware


load_dotenv()

APP_NAME = os.getenv("APP_NAME", "Admin")
APP_ENV = os.getenv("APP_ENV", "local")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8001/auth/google/callback",
)
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "change-me-for-local-dev")
TEXT_EDITOR_DIST = Path(
    os.getenv(
        "TEXT_EDITOR_DIST",
        str(Path(__file__).with_name("text_editor_dist")),
    )
).resolve()
STATIC_DIR = Path(__file__).with_name("static")

LOCAL_DATAHUB_DIR = Path(__file__).resolve().parent.parent / "datahub"
DEFAULT_DATABASE_FILE = (
    LOCAL_DATAHUB_DIR / "datahub.db"
    if LOCAL_DATAHUB_DIR.exists()
    else Path(__file__).with_name("datahub.db")
)
DATABASE_FILE = Path(os.getenv("DATAHUB_DATABASE_FILE", str(DEFAULT_DATABASE_FILE))).resolve()
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_FILE}")
UPLOAD_DIR = Path(
    os.getenv(
        "DATAHUB_UPLOAD_DIR",
        str((LOCAL_DATAHUB_DIR / "uploads") if LOCAL_DATAHUB_DIR.exists() else Path(__file__).with_name("uploads")),
    )
).resolve()

ALLOWED_EMAILS = {
    email.strip().lower()
    for email in os.getenv("ALLOWED_EMAILS", "").split(",")
    if email.strip()
}
ALLOWED_DOMAINS = {
    domain.strip().lower().lstrip("@")
    for domain in os.getenv("ALLOWED_DOMAINS", "").split(",")
    if domain.strip()
}

app = FastAPI(title=APP_NAME)
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET_KEY,
    same_site="lax",
    https_only=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
)

oauth = OAuth()
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if (TEXT_EDITOR_DIST / "assets").is_dir():
    app.mount(
        "/admin/editor/assets",
        StaticFiles(directory=TEXT_EDITOR_DIST / "assets"),
        name="text-editor-assets",
    )

if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DocumentNode(Base):
    __tablename__ = "document_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("document_nodes.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    node_kind: Mapped[str] = mapped_column(String(50), nullable=False, default="content")
    body_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")

    parent: Mapped["DocumentNode | None"] = relationship(
        "DocumentNode",
        remote_side=[id],
        back_populates="children",
    )
    children: Mapped[list["DocumentNode"]] = relationship(
        "DocumentNode",
        back_populates="parent",
        cascade="all, delete-orphan",
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_database(db: Session) -> None:
    if db.query(DocumentNode).count() > 0:
        return

    root = DocumentNode(
        title="임시 카테고리",
        node_kind="category",
        body_content="문서 데이터 허브 루트 카테고리",
    )
    db.add(root)
    db.flush()
    db.add_all(
        [
            DocumentNode(parent_id=root.id, title="A", node_kind="content", body_content="A 문서 샘플 내용입니다."),
            DocumentNode(parent_id=root.id, title="B", node_kind="content", body_content="B 문서 샘플 내용입니다."),
            DocumentNode(parent_id=root.id, title="C", node_kind="content", body_content="C 문서 샘플 내용입니다."),
        ]
    )
    db.commit()


def ensure_schema(db: Session) -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return

    columns = {
        row[1]
        for row in db.execute(text("PRAGMA table_info(document_nodes)")).fetchall()
    }
    if columns and "is_locked" not in columns:
        db.execute(text("ALTER TABLE document_nodes ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0"))
        db.commit()


@app.on_event("startup")
def on_startup() -> None:
    if DATABASE_URL.startswith("sqlite"):
        DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        ensure_schema(db)
        seed_database(db)


def _is_allowed_user(user: dict[str, Any]) -> bool:
    email = str(user.get("email", "")).lower()
    domain = email.rsplit("@", 1)[-1] if "@" in email else ""

    if ALLOWED_EMAILS or ALLOWED_DOMAINS:
        return email in ALLOWED_EMAILS or domain in ALLOWED_DOMAINS

    return True


def _page(title: str, body: str, *, full_screen: bool = False) -> HTMLResponse:
    app_name = escape(APP_NAME)
    page_title = escape(title)
    body_class = "full-screen" if full_screen else "card-screen"
    main_class = "editor-shell" if full_screen else "login-card"

    return HTMLResponse(
        f"""
        <!doctype html>
        <html lang="ko">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>{page_title}</title>
            <style>
              :root {{
                color-scheme: light;
                font-family:
                  Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
                  "Segoe UI", sans-serif;
                color: #17202a;
                background: #f4f7fb;
              }}

              body {{
                min-height: 100vh;
                margin: 0;
              }}

              body.card-screen {{
                display: grid;
                place-items: center;
              }}

              body.full-screen {{
                display: block;
                background: #ffffff;
              }}

              main.login-card {{
                width: min(680px, calc(100vw - 40px));
                padding: 48px;
                border: 1px solid #d9e1ea;
                border-radius: 8px;
                background: #ffffff;
                box-shadow: 0 18px 50px rgb(23 32 42 / 8%);
              }}

              h1 {{
                margin: 0 0 12px;
                font-size: clamp(32px, 6vw, 52px);
                line-height: 1;
                letter-spacing: 0;
              }}

              p {{
                margin: 0;
                color: #4d5f72;
                font-size: 18px;
                line-height: 1.65;
              }}

              a.button,
              button {{
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 44px;
                margin-top: 28px;
                padding: 0 18px;
                border: 1px solid #c8d2df;
                border-radius: 6px;
                color: #17202a;
                background: #ffffff;
                font-size: 16px;
                font-weight: 700;
                text-decoration: none;
                cursor: pointer;
              }}

              a.button:hover,
              button:hover {{
                background: #f8fafc;
              }}

              form {{
                margin: 0;
              }}

              .meta {{
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                margin-top: 28px;
              }}

              .meta span {{
                padding: 8px 12px;
                border: 1px solid #d9e1ea;
                border-radius: 999px;
                color: #2d3c4d;
                background: #f8fafc;
                font-size: 14px;
              }}

              main.editor-shell {{
                height: 100vh;
                display: grid;
                grid-template-rows: auto 1fr;
                background: #f6f7f9;
              }}

              .admin-bar {{
                min-height: 56px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                padding: 10px 20px;
                border-bottom: 1px solid #d9e1ea;
                background: #ffffff;
              }}

              .admin-title {{
                min-width: 0;
              }}

              .admin-title strong {{
                display: block;
                color: #17202a;
                font-size: 16px;
              }}

              .admin-title span {{
                display: block;
                overflow: hidden;
                color: #64748b;
                font-size: 13px;
                text-overflow: ellipsis;
                white-space: nowrap;
              }}

              .admin-actions {{
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 0 0 auto;
              }}

              .admin-actions form {{
                display: flex;
              }}

              .admin-actions a.button,
              .admin-actions button {{
                min-height: 36px;
                margin-top: 0;
                padding: 0 12px;
                font-size: 14px;
              }}

              .editor-frame {{
                width: 100%;
                height: 100%;
                min-height: 0;
                display: block;
                border: 0;
                background: #f6f7f9;
              }}

              .editor-unavailable {{
                align-self: start;
                margin: 32px auto;
                width: min(720px, calc(100vw - 40px));
                padding: 28px;
                border: 1px solid #d9e1ea;
                border-radius: 8px;
                background: #ffffff;
              }}

              .editor-unavailable code {{
                padding: 2px 6px;
                border-radius: 4px;
                background: #eef2f7;
              }}
            </style>
          </head>
          <body class="{body_class}">
            <main class="{main_class}" aria-label="{app_name}">
              {body}
            </main>
          </body>
        </html>
        """
    )


def _require_user(request: Request) -> dict[str, Any] | None:
    user = request.session.get("user")
    return user if isinstance(user, dict) else None


def _asset_version() -> int:
    paths = [STATIC_DIR / "app.js", STATIC_DIR / "styles.css"]
    existing_paths = [path for path in paths if path.exists()]
    if not existing_paths:
        return 1
    return max(int(path.stat().st_mtime) for path in existing_paths)


def _build_tree(node: DocumentNode) -> dict[str, Any]:
    sorted_children = sorted(node.children, key=lambda child: child.id)
    return {
        "id": node.id,
        "title": node.title,
        "node_kind": node.node_kind,
        "body_content": node.body_content,
        "file_name": node.file_name,
        "has_file": bool(node.file_path),
        "is_locked": bool(node.is_locked),
        "download_url": f"/files/{node.id}" if node.file_path else None,
        "children": [_build_tree(child) for child in sorted_children],
    }


def _get_root_node(db: Session) -> DocumentNode:
    root = db.query(DocumentNode).filter(DocumentNode.parent_id.is_(None)).first()
    if root is None:
        root = DocumentNode(title="임시 카테고리", node_kind="category")
        db.add(root)
        db.commit()
        db.refresh(root)
    return root


def _collect_file_paths(node: DocumentNode) -> list[Path]:
    paths: list[Path] = []
    if node.file_path:
        paths.append(Path(node.file_path))
    for child in node.children:
        paths.extend(_collect_file_paths(child))
    return paths


def _editor_index_response() -> HTMLResponse:
    index_file = TEXT_EDITOR_DIST / "index.html"
    if not index_file.is_file():
        return _page(
            title=f"{APP_NAME} Editor",
            body=f"""
              <header class="admin-bar">
                <div class="admin-title">
                  <strong>{escape(APP_NAME)}</strong>
                  <span>Text editor build is missing.</span>
                </div>
                <div class="admin-actions">
                  <form method="post" action="/logout">
                    <button type="submit">로그아웃</button>
                  </form>
                </div>
              </header>
              <section class="editor-unavailable">
                <h1>에디터 빌드가 없습니다</h1>
                <p><code>npm --prefix ../Text_editor run build -- --base=/admin/editor/</code> 실행 후 <code>Text_editor/dist</code> 내용을 <code>admin/text_editor_dist</code>로 복사해주세요.</p>
              </section>
            """,
            full_screen=True,
        )

    return HTMLResponse(index_file.read_text(encoding="utf-8"))


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "env": APP_ENV}


@app.get("/", response_class=HTMLResponse)
async def login_page(request: Request) -> Response:
    if _require_user(request):
        return RedirectResponse(url="/admin", status_code=status.HTTP_303_SEE_OTHER)

    app_name = escape(APP_NAME)
    return _page(
        title=f"{APP_NAME} Login",
        body=f"""
          <h1>{app_name}</h1>
          <p>관리자 페이지에 접근하려면 Google 계정으로 인증해주세요.</p>
          <a class="button" href="/login/google">Google로 로그인</a>
        """,
    )


@app.get("/login/google")
async def login_google(request: Request) -> Response:
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)


@app.get("/auth/google/callback")
async def auth_google_callback(request: Request) -> Response:
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured.",
        )

    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google OAuth failed: {exc.error}",
        ) from exc

    user = dict(token.get("userinfo") or {})
    if not user:
        user = dict(await oauth.google.userinfo(token=token))

    if not user.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Google email is not verified.",
        )

    if not _is_allowed_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This Google account is not allowed.",
        )

    request.session["user"] = {
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
    }
    return RedirectResponse(url="/admin", status_code=status.HTTP_303_SEE_OTHER)


@app.post("/logout")
async def logout(request: Request) -> RedirectResponse:
    request.session.clear()
    return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)


@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request) -> Response:
    if not _require_user(request):
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    return RedirectResponse(url="/admin/tree", status_code=status.HTTP_303_SEE_OTHER)


@app.get("/admin/tree", response_class=HTMLResponse)
async def admin_tree_page(request: Request, db: Session = Depends(get_db)) -> Response:
    user = _require_user(request)
    if not user:
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)

    root = _get_root_node(db)
    tree_json = json.dumps(_build_tree(root), ensure_ascii=False)
    asset_version = _asset_version()
    name = escape(str(user.get("name") or user.get("email") or "관리자"))

    return HTMLResponse(
        f"""
        <!doctype html>
        <html lang="ko">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>문서 트리 관리 | {escape(APP_NAME)}</title>
            <link rel="stylesheet" href="/static/styles.css?v={asset_version}" />
          </head>
          <body>
            <main class="page-shell admin-shell">
              <section class="hero-card admin-hero">
                <div>
                  <p class="eyebrow">Admin View</p>
                  <h1>문서 트리 관리</h1>
                  <p class="hero-copy">
                    {name} 계정으로 전체 트리를 관리합니다. 기존 노드 추가 에디터 흐름은 그대로 유지됩니다.
                  </p>
                </div>
                <div class="lock-panel">
                  <form method="post" action="/logout">
                    <button class="secondary-link" type="submit">로그아웃</button>
                  </form>
                </div>
              </section>

              <section id="admin-layout" class="admin-layout">
                <section class="tree-section admin-tree-panel">
                  <div class="section-title">
                    <p class="eyebrow">Full Tree</p>
                    <h2>전체 문서 구조</h2>
                  </div>
                  <div class="tree-toolbar">
                    <button id="admin-zoom-out" class="tree-tool-button" type="button">-</button>
                    <span id="admin-zoom-label" class="tree-zoom-label">100%</span>
                    <button id="admin-zoom-in" class="tree-tool-button" type="button">+</button>
                    <button id="admin-zoom-reset" class="tree-tool-button is-wide" type="button">맞춤</button>
                  </div>
                  <p class="admin-tree-hint">
                    FULL TREE 박스 안에서 마우스로 잡고 이동하면서 노드를 확인하세요. 각 노드 하단의 원형 포트에 hover하면
                    <strong>+</strong>가 나타나고, 그 버튼을 눌렀을 때만 Node Editor가 열립니다.
                  </p>
                  <div id="admin-tree-frame" class="admin-tree-frame">
                    <div id="admin-tree-stage" class="admin-tree-stage">
                      <svg id="admin-tree-svg" class="admin-tree-svg" aria-hidden="true"></svg>
                      <div id="admin-tree-canvas" class="admin-tree-canvas"></div>
                    </div>
                  </div>
                </section>

                <aside id="admin-editor-panel" class="editor-card admin-editor-panel" hidden aria-hidden="true">
                  <div class="editor-card-header">
                    <div class="section-title">
                      <p class="eyebrow">Node Editor</p>
                      <h2 id="admin-editor-title">새 문서 추가</h2>
                    </div>
                    <button id="admin-editor-close" class="editor-close-button" type="button">닫기</button>
                  </div>
                  <form action="/admin/nodes" method="post" enctype="multipart/form-data" class="node-form">
                    <label>
                      부모 노드
                      <input id="selected-parent-label" type="text" value="{escape(root.title)} (#{root.id})" readonly />
                    </label>
                    <input id="parent-id-input" name="parent_id" type="hidden" value="{root.id}" />

                    <label>
                      제목
                      <input name="title" type="text" placeholder="예: 신규 가이드 문서" required />
                    </label>

                    <label>
                      유형
                      <select name="node_kind" id="node-kind-select">
                        <option value="category">카테고리</option>
                        <option value="content" selected>내용 문서</option>
                        <option value="file">파일 문서</option>
                      </select>
                    </label>

                    <label>
                      내용
                      <textarea
                        name="body_content"
                        id="content-input"
                        rows="5"
                        placeholder="문서 내용을 직접 입력할 때 사용하세요."
                        hidden
                      ></textarea>
                    </label>
                    <iframe
                      id="content-editor-frame"
                      class="embedded-content-editor"
                      src="/admin/editor/?embed=1"
                      title="문서 내용 에디터"
                    ></iframe>

                    <label>
                      파일 업로드
                      <input name="uploaded_file" id="file-input" type="file" />
                    </label>

                    <button class="primary-button" type="submit">선택한 노드 아래에 추가</button>
                  </form>

                  <div class="helper-card">
                    <p class="helper-title">추가 방식</p>
                    <p>
                      트리에서 추가할 노드의 하단 원형 포트를 hover한 뒤 <strong>+</strong>를 누르면,
                      선택한 부모 노드 기준으로 editor가 열립니다. 불필요한 문서는 카드의 <strong>삭제</strong> 버튼으로 정리할 수 있습니다.
                    </p>
                  </div>
                </aside>
              </section>
            </main>
            <script src="/static/app.js?v={asset_version}"></script>
            <script>
              window.DATA_HUB_PAGE = {{
                mode: "admin",
                tree: {tree_json}
              }};
            </script>
          </body>
        </html>
        """
    )


@app.post("/admin/nodes")
async def create_node(
    request: Request,
    parent_id: int = Form(...),
    title: str = Form(...),
    node_kind: str = Form(...),
    body_content: str = Form(""),
    is_locked: str | None = Form(default=None),
    uploaded_file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
) -> Response:
    if not _require_user(request):
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)

    if db.get(DocumentNode, parent_id) is None:
        raise HTTPException(status_code=404, detail="Parent node not found")

    file_name = None
    file_path = None
    if node_kind == "file" and uploaded_file and uploaded_file.filename:
        safe_name = f"{uuid4().hex}_{Path(uploaded_file.filename).name}"
        destination = UPLOAD_DIR / safe_name
        with destination.open("wb") as buffer:
            shutil.copyfileobj(uploaded_file.file, buffer)
        file_name = uploaded_file.filename
        file_path = str(destination)

    node = DocumentNode(
        parent_id=parent_id,
        title=title,
        node_kind=node_kind,
        body_content=body_content or None,
        file_name=file_name,
        file_path=file_path,
        is_locked=bool(is_locked),
    )
    db.add(node)
    db.commit()
    return RedirectResponse(url="/admin/tree", status_code=status.HTTP_303_SEE_OTHER)


@app.post("/admin/nodes/{node_id}/edit")
async def update_node(
    request: Request,
    node_id: int,
    title: str = Form(...),
    node_kind: str = Form(...),
    body_content: str = Form(""),
    uploaded_file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
) -> Response:
    if not _require_user(request):
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)

    node = db.get(DocumentNode, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")

    node.title = title
    node.node_kind = node_kind
    node.body_content = body_content or None

    if node_kind == "file" and uploaded_file and uploaded_file.filename:
        old_file_path = Path(node.file_path) if node.file_path else None
        safe_name = f"{uuid4().hex}_{Path(uploaded_file.filename).name}"
        destination = UPLOAD_DIR / safe_name
        with destination.open("wb") as buffer:
            shutil.copyfileobj(uploaded_file.file, buffer)
        node.file_name = uploaded_file.filename
        node.file_path = str(destination)
        if old_file_path and old_file_path.exists():
            old_file_path.unlink()

    if node_kind != "file":
        node.file_name = None
        old_file_path = Path(node.file_path) if node.file_path else None
        node.file_path = None
        if old_file_path and old_file_path.exists():
            old_file_path.unlink()

    db.commit()
    return RedirectResponse(url="/admin/tree", status_code=status.HTTP_303_SEE_OTHER)


@app.post("/admin/nodes/{node_id}/delete")
def delete_node(request: Request, node_id: int, db: Session = Depends(get_db)):
    if not _require_user(request):
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)

    node = db.get(DocumentNode, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    if node.parent_id is None:
        raise HTTPException(status_code=400, detail="Root node cannot be deleted")

    file_paths = _collect_file_paths(node)
    db.delete(node)
    db.commit()

    for file_path in file_paths:
        if file_path.exists():
            file_path.unlink()

    return {"ok": True}


@app.get("/files/{node_id}")
def download_file(node_id: int, db: Session = Depends(get_db)) -> Response:
    node = db.get(DocumentNode, node_id)
    if not node or not node.file_path:
        return RedirectResponse(url="/admin/tree", status_code=status.HTTP_303_SEE_OTHER)
    return FileResponse(path=node.file_path, filename=node.file_name or Path(node.file_path).name)


@app.get("/admin/editor", response_class=HTMLResponse)
@app.get("/admin/editor/{path:path}", response_class=HTMLResponse)
async def editor_page(request: Request) -> Response:
    if not _require_user(request):
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)

    return _editor_index_response()
