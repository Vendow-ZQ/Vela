import json
import os
from typing import Optional
from abc import ABC, abstractmethod

from config import get_settings


class LLMClient(ABC):
    """Abstract base class for LLM clients."""

    @abstractmethod
    async def chat(self, system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
        """Send a chat request and return the text response."""
        pass


class AnthropicClient(LLMClient):
    def __init__(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            from anthropic import AsyncAnthropic
            self._client = AsyncAnthropic(
                api_key=self.api_key,
                base_url=self.base_url,
            )
        return self._client

    async def chat(self, system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
        client = self._get_client()
        response = await client.messages.create(
            model=self.model,
            max_tokens=4096,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text


class BedrockClient(LLMClient):
    def __init__(self, region: str, model_id: str, access_key: str, secret_key: str):
        self.region = region
        self.model_id = model_id
        self.access_key = access_key
        self.secret_key = secret_key
        self._client = None

    def _get_client(self):
        if self._client is None:
            import boto3
            self._client = boto3.client(
                "bedrock-runtime",
                region_name=self.region,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
            )
        return self._client

    async def chat(self, system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
        import asyncio
        client = self._get_client()

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "temperature": temperature,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        })

        # boto3 is sync, run in thread pool
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.invoke_model(
                modelId=self.model_id,
                body=body,
            )
        )

        response_body = json.loads(response["body"].read())
        return response_body["content"][0]["text"]


class OpenAIClient(LLMClient):
    def __init__(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self._client = None

    def _get_client(self):
        if self._client is None:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
            )
        return self._client

    async def chat(self, system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
        client = self._get_client()
        response = await client.chat.completions.create(
            model=self.model,
            max_tokens=4096,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content or ""


def get_llm_client() -> LLMClient:
    """Factory function to create the appropriate LLM client based on config."""
    settings = get_settings()
    provider = settings.llm_provider.lower()

    if provider == "anthropic":
        # 优先使用 anthropic_model，如果没有设置则使用 agent_model
        model = settings.anthropic_model or settings.agent_model
        return AnthropicClient(
            api_key=settings.anthropic_api_key,
            base_url=settings.anthropic_base_url,
            model=model,
        )
    elif provider == "bedrock":
        return BedrockClient(
            region=settings.aws_region,
            model_id=settings.bedrock_model_id,
            access_key=settings.aws_access_key_id,
            secret_key=settings.aws_secret_access_key,
        )
    elif provider == "openai":
        return OpenAIClient(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.agent_model,
        )
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")
