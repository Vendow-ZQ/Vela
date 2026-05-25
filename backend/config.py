from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache


# 尝试从多个位置加载 .env：当前目录 或 父目录（项目根目录）
_POSSIBLE_ENV_PATHS = [".env", "../.env"]
_ENV_FILE = None
for _p in _POSSIBLE_ENV_PATHS:
    if Path(_p).exists():
        _ENV_FILE = _p
        break


class Settings(BaseSettings):
    """Load config from .env file"""

    # LLM Provider
    llm_provider: str = "anthropic"  # anthropic | bedrock | openai

    # Anthropic
    anthropic_api_key: str = ""
    anthropic_base_url: str = "https://api.anthropic.com"
    anthropic_model: str = ""

    # AWS Bedrock
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    bedrock_model_id: str = "anthropic.claude-sonnet-4-6-v1"

    # OpenAI
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"

    # General
    agent_model: str = "claude-sonnet-4-6"
    backend_port: int = 8001
    backend_host: str = "0.0.0.0"

    class Config:
        env_file = _ENV_FILE if _ENV_FILE else ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
