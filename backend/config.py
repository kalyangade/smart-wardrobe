from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-haiku-4-5-20251001"
    DATABASE_URL: str = "sqlite:///./wardrobe.db"
    UPLOAD_DIR: str = "./uploads"
    MAX_IMAGE_SIZE_MB: int = 10
    DUPLICATE_THRESHOLD: int = 3
    BUDGET_WARNING_PERCENT: float = 0.8
    DEALS_REFRESH_HOUR: int = 3

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
