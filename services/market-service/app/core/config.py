from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# app/core/config.py -> app/core -> app -> market-service
_SERVICE_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Gurgaon Market Service"
    api_prefix: str = "/api/v1"

    market_data_path: Path = Path("data/market_data.parquet")

    web_origin: str = "http://localhost:3000"

    @property
    def resolved_market_data_path(self) -> Path:
        return (_SERVICE_ROOT / self.market_data_path).resolve()


settings = Settings()
