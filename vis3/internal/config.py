from typing import Any

from loguru import logger
from pydantic_settings import BaseSettings

from vis3.internal.common.io import get_data_dir
from vis3.internal.utils import update_sys_config
from vis3.version import version


class Settings(BaseSettings):
    SCHEME: str = "http"
    HOST: str = "0.0.0.0"
    PORT: str = "8001"
    API_V1_STR: str = "/api/v1"

    # Enable user authentication
    ENABLE_AUTH: bool = False

    BASE_URL: str = ""
    BASE_DATA_DIR: str = get_data_dir()
    DATABASE_URL: str | None = None

    ENCRYPT_KEY: str = "TKmgoAuHCGmS23H8GGXISedt9W8hIGzLx4lu8WNDLOY="

    # Replace with your own secret key
    PASSWORD_SECRET_KEY: str = (
        "8a317ca270f349edfcba70db44dd9408b0ebe755c6c29df8d2f15fc40437c961"
    )

    TOKEN_GENERATE_ALGORITHM: str = "HS256"
    TOKEN_ACCESS_EXPIRE_MINUTES: int = 43200  # 30天 (30*24*60=43200分钟)
    TOKEN_TYPE: str = "Bearer"

    def model_post_init(self, __context: Any) -> None:
        db_name = "vis3.public.sqlite"

        if self.ENABLE_AUTH:
            db_name = "vis3.sqlite"

        if not self.DATABASE_URL:
            self.DATABASE_URL = f"sqlite:///{self.BASE_DATA_DIR}/{db_name}"
        

        logger.info(f"DATABASE_URL: {self.DATABASE_URL}")

        update_sys_config({
            "BASE_URL": self.BASE_URL,
            "ENABLE_AUTH": self.ENABLE_AUTH,
            "VERSION": version,
        })

    class Config:
        env_prefix = ""
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
