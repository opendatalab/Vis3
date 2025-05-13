from typing import Any

from pydantic import BaseSettings

from visu.common.io import get_data_dir


class Settings(BaseSettings):
    SCHEME: str = "http"
    HOST: str = "localhost"
    PORT: str = "8001"
    API_V1_STR: str = "/api/v1"

    # Enable user authentication
    ENABLE_AUTH: bool = False

    BASE_DATA_DIR: str = get_data_dir()
    DATABASE_URL: str | None = None

    # Replace with your own secret key
    PASSWORD_SECRET_KEY: str = (
        "8a317ca270f349edfcba70db44dd9408b0ebe755c6c29df8d2f15fc40437c961"
    )

    TOKEN_GENERATE_ALGORITHM: str = "HS256"
    TOKEN_ACCESS_EXPIRE_MINUTES: int = 30
    TOKEN_TYPE: str = "Bearer"

    def model_post_init(self, __context: Any) -> None:
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"sqlite:///{self.BASE_DATA_DIR}/visu.sqlite"

    class Config:
        env_prefix = ""
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
