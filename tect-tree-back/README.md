# ATHENA DOCTRINE — Backend

FastAPI 기반 API 서버.

## 로컬 실행

```bash
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

- Swagger: http://localhost:8000/docs
- Health: http://localhost:8000/health

## 마이그레이션

```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

## 테스트

```bash
pytest
```

## 레이아웃

- `app/main.py` — 엔트리
- `app/routers/` — HTTP/WS 엔드포인트
- `app/services/` — 비즈니스 로직
- `app/models/` — SQLAlchemy ORM
- `app/schemas/` — Pydantic 요청·응답 모델
- `app/core/` — JWT, WS 매니저, 공통 예외
- `docs/API_SPEC.md` — API 명세서
