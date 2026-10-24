from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: int = 5432
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    SECRET_KEY: str

    # Where uploaded files are written. Paths stored in the database are
    # relative to this folder, so it can be moved without touching rows.
    UPLOAD_DIR: Path = BACKEND_DIR / "uploads"
    # Browser origins allowed to call this API (the web frontend). Comma-
    # separated. On the live server set this to the frontend's URL, e.g.
    #   CORS_ORIGINS=http://YOUR_SERVER:8082
    CORS_ORIGINS: str = "http://localhost:8082,http://127.0.0.1:8082,http://localhost:4173,https://onehealth-stage.indevconsultancy.in"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # Login token lifetime: 2 days (48 hours).
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 2 * 24 * 60

    # Failed PIN attempts allowed per volunteer inside the window before
    # sign-in is refused until the window passes.
    LOGIN_MAX_FAILURES: int = 5
    LOGIN_LOCK_MINUTES: int = 15

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
