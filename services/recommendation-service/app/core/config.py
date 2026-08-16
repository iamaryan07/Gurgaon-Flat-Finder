from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# app/core/config.py -> app/core -> app -> recommendation-service
_SERVICE_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Gurgaon Recommendation Service"
    api_prefix: str = "/api/v1"

    recommendation_data_path: Path = Path("data/data_recommendation_v2.csv")
    geo_cache_path: Path = Path("data/geo_cache.pkl")
    geo_cache_old_path: Path = Path("data/geo_cache_old.pkl")

    redis_url: str = ""
    redis_cache_ttl_seconds: int = 600

    web_origin: str = "http://localhost:3000"

    @property
    def resolved_recommendation_data_path(self) -> Path:
        return (_SERVICE_ROOT / self.recommendation_data_path).resolve()

    @property
    def resolved_geo_cache_path(self) -> Path:
        return (_SERVICE_ROOT / self.geo_cache_path).resolve()

    @property
    def resolved_geo_cache_old_path(self) -> Path:
        return (_SERVICE_ROOT / self.geo_cache_old_path).resolve()


settings = Settings()
