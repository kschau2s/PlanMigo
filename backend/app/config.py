from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- OpenRouter ---
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "anthropic/claude-sonnet-4.5"
    OPENROUTER_APP_NAME: str = "PlanMigo"
    OPENROUTER_SITE_URL: str = "https://planmigo.app"

    # --- Backend ---
    DATABASE_URL: str = "postgresql+asyncpg://planmigo:planmigo@db:5432/planmigo"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    SECRET_KEY: str = "change-me"

    # --- Travel APIs ---
    AMADEUS_API_KEY: str = ""
    AMADEUS_API_SECRET: str = ""
    BOOKING_AFFILIATE_KEY: str = ""
    GETYOURGUIDE_API_KEY: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
