from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Gurgaon API Gateway"

    prediction_service_url: str = "http://localhost:8001"
    market_service_url: str = "http://localhost:8002"
    recommendation_service_url: str = "http://localhost:8003"

    web_origin: str = "http://localhost:3000"


settings = Settings()
