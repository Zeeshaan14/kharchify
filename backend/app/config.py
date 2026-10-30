from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./kharchify.db"
    secret_key: str = "dev-only-insecure-secret-key-change-me-in-env"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: list[str] = ["http://localhost:3000"]
    # Turn off after creating your account on a public deployment.
    allow_registration: bool = True

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, url: str) -> str:
        # Hosts (Neon, Render) hand out postgres:// or postgresql:// URLs;
        # SQLAlchemy needs the driver named to use psycopg 3.
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url


settings = Settings()
