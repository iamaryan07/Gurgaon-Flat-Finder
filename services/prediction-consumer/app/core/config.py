from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Gurgaon Prediction Consumer"

    rabbitmq_url: str = ""
    database_url: str = ""


settings = Settings()
