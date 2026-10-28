from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    APP_NAME: str = "Memoir API"
    DEBUG: bool = False
    ALLOW_REGISTRATION: bool = False
    DATABASE_URL: str = "postgresql+asyncpg://memoir:memoir@localhost:5432/memoir"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    UPLOAD_DIR: str = "uploads"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30


settings = Settings()

DEFAULT_SECRET_KEY = "change-me-in-production"
MIN_SECRET_KEY_LENGTH = 32


def check_production_settings() -> None:
    """Refuse to start in production with a guessable signing key."""
    if settings.DEBUG:
        return
    if settings.SECRET_KEY == DEFAULT_SECRET_KEY or len(settings.SECRET_KEY) < MIN_SECRET_KEY_LENGTH:
        raise RuntimeError(
            f"SECRET_KEY must be set to a random value of at least {MIN_SECRET_KEY_LENGTH} characters "
            "(openssl rand -hex 32)"
        )
