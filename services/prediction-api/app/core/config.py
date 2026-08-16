from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# app/core/config.py -> app/core -> app -> prediction-api -> services -> repo root
_REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Gurgaon Prediction API"
    api_prefix: str = "/api/v1"

    model_repo_id: str = "iamAryan/gurgaon-property-price-model"
    model_filename: str = "property_price_model.pkl"
    market_data_path: Path = Path("packages/model/market_data.parquet")
    recommendation_data_path: Path = Path("packages/recommendation-data/data_recommendation_v2.csv")
    geo_cache_path: Path = Path("packages/recommendation-data/geo_cache.pkl")
    geo_cache_old_path: Path = Path("packages/recommendation-data/geo_cache_old.pkl")

    database_url: str | None = None
    web_origin: str = "http://localhost:3000"

    @property
    def repo_root(self) -> Path:
        return _REPO_ROOT

    @property
    def resolved_market_data_path(self) -> Path:
        return (_REPO_ROOT / self.market_data_path).resolve()

    @property
    def resolved_recommendation_data_path(self) -> Path:
        return (_REPO_ROOT / self.recommendation_data_path).resolve()

    @property
    def resolved_geo_cache_path(self) -> Path:
        return (_REPO_ROOT / self.geo_cache_path).resolve()

    @property
    def resolved_geo_cache_old_path(self) -> Path:
        return (_REPO_ROOT / self.geo_cache_old_path).resolve()


settings = Settings()
