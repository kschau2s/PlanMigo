import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401  # register ORM models on Base.metadata
from app.api.v1.router import api_router
from app.config import get_settings
from app.core.logging import configure_logging
from app.models.session import Base, engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    # No Alembic yet (open item in CLAUDE.md) — create missing tables on startup.
    # PostgreSQL may still be coming online during a fresh docker-compose start; retrying avoids
    # a startup crash that otherwise leaves the chat API unavailable.
    last_error: Exception | None = None
    for attempt in range(30):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            break
        except Exception as exc:  # pragma: no cover - exercised during container startup
            last_error = exc
            if attempt == 29:
                raise
            await asyncio.sleep(1)
    if last_error is not None:
        # Keep the startup path explicit for debugging if the DB still never becomes available.
        print(f"Database startup retry exhausted: {last_error}")
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(title="PlanMigo API", version="1.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=settings.CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    return app


app = create_app()
