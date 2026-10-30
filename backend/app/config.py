from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./kharchify.db"
    secret_key: str = "dev-only-insecure-secret-key-change-me-in-env"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
