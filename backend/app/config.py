from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo-root .env works when uvicorn runs from backend/; missing files are ignored (Docker
# injects the same variables via env_file in docker-compose.yml).
_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(_ROOT_ENV, ".env"), extra="ignore")

    # --- OpenRouter ---
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "anthropic/claude-sonnet-4.5"
    OPENROUTER_APP_NAME: str = "PlanMigo"
    OPENROUTER_SITE_URL: str = "https://planmigo.app"

    # --- Backend ---
    DATABASE_URL: str = "postgresql+asyncpg://planmigo:planmigo@db:5432/planmigo"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    # Allows forwarded dev hosts (e.g. GitHub Codespaces) without listing each origin.
    CORS_ORIGIN_REGEX: str | None = r"https://.*\.app\.github\.dev"
    SECRET_KEY: str = "change-me"

    # --- Unsplash (destination photos) ---
    UNSPLASH_ACCESS_KEY: str = ""

    # --- Travel APIs ---
    AMADEUS_API_KEY: str = ""
    AMADEUS_API_SECRET: str = ""
    BOOKING_AFFILIATE_KEY: str = ""
    GETYOURGUIDE_API_KEY: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
