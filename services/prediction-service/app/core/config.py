from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Gurgaon Prediction Service"
    api_prefix: str = "/api/v1"

    model_repo_id: str = "iamAryan/gurgaon-property-price-model"
    model_filename: str = "property_price_model.pkl"

    rabbitmq_url: str = ""
    web_origin: str = "http://localhost:3000"


settings = Settings()
