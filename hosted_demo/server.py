import json

from openai import OpenAI
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from system_prompt import system_prompts


app = FastAPI()
client = OpenAI()


# FIXME: ça, ça drevrait juste être un wrapper ChatGPT, ça devrait pas intégrer les ads
# Aussi, pour les ads pas besoin de faire un stream, un REST api devrait suffire
@app.websocket("/ws/{type}")
async def websocket_endpoint(websocket: WebSocket, type: str = "native"):
    await websocket.accept()

    if type not in system_prompts:
        await websocket.close(code=4000, reason="Invalid ad type")

    data = await websocket.receive_text()
    print("data:", data)
    messages = [{"role": "system", "content": system_prompts[type]}] + json.loads(data)

    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        stream=True,
    )

    buffer = ""
    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            buffer += chunk.choices[0].delta.content
            await websocket.send_text(chunk.choices[0].delta.content)

    print("\nSent: ", buffer)

    await websocket.close()
