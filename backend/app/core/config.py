from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "CareerOS"
    database_url: str = "sqlite:///../../database/careeros.sqlite"

settings = Settings()
