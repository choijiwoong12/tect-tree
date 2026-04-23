from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, auth, nodes, payments, rp, users, ws


def create_app() -> FastAPI:
    app = FastAPI(
        title="ATHENA DOCTRINE TECH TREE API",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(users.router, prefix="/api/users", tags=["users"])
    app.include_router(rp.router, prefix="/api/rp", tags=["rp"])
    app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
    app.include_router(nodes.router, prefix="/api/nodes", tags=["nodes"])
    app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
    app.include_router(ws.router, prefix="/ws", tags=["ws"])

    @app.get("/health", tags=["meta"])
    def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
