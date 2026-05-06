from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    APP_NAME: str = "Memoir API"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql+asyncpg://memoir:memoir@localhost:5432/memoir"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    UPLOAD_DIR: str = "uploads"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30


settings = Settings()
