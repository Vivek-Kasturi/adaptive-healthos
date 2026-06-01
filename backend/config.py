from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Google Cloud
    google_cloud_project: str
    google_cloud_region: str = "us-central1"
    gemini_model: str = "gemini-2.5-flash"

    # MongoDB
    mongodb_uri: str
    mongodb_db_name: str = "healthos"

    # App
    app_env: str = "development"
    secret_key: str

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
