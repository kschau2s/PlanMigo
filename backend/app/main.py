import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401  # register ORM models on Base.metadata
from app.api.v1.router import api_router
from app.config import get_settings
from app.core.logging import configure_logging
from app.models.session import engine

_BACKEND_DIR = Path(__file__).resolve().parents[1]


def run_migrations_sync() -> None:
    """Apply Alembic migrations up to head (idempotent)."""
    alembic_cfg = AlembicConfig(str(_BACKEND_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Alembic owns the schema. env.py drives its own event loop, so the upgrade
    # must run in a worker thread, never on the running loop.
    await asyncio.to_thread(run_migrations_sync)
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
