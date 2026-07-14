"""
PlanMigo Pipeline für Open WebUI.

Reicht jeden Nutzer-Turn aus dem Open-WebUI-Chat an POST /api/v1/chat des
FastAPI-Backends weiter. Open WebUI ruft NIE direkt OpenRouter auf — der
LLM-Call und die Dialogsteuerung passieren ausschließlich im Backend.
"""

import os
from typing import Generator, Iterator, Union

import requests


class Pipeline:
    class Valves:
        def __init__(self):
            self.backend_url = os.getenv("PLANMIGO_BACKEND_URL", "http://backend:8000/api/v1")
            self.timeout_seconds = float(os.getenv("PLANMIGO_TIMEOUT_SECONDS", "60"))

    def __init__(self):
        self.name = "PlanMigo Pipeline"
        self.valves = self.Valves()
        self._conversation_ids: dict[str, str] = {}

    async def on_startup(self):
        pass

    async def on_shutdown(self):
        pass

    def pipe(
        self, user_message: str, model_id: str, messages: list, body: dict
    ) -> Union[str, Generator, Iterator]:
        chat_id = body.get("chat_id", "default")
        conversation_id = self._conversation_ids.get(chat_id)

        response = requests.post(
            f"{self.valves.backend_url}/chat",
            json={
                "conversation_id": conversation_id,
                "keywords": body.get("keywords", []),
                "message": user_message,
            },
            timeout=self.valves.timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()

        self._conversation_ids[chat_id] = data["conversation_id"]
        return data["reply"]
