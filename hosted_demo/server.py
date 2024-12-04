import json

from openai import OpenAI
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from system_prompt import system_prompt


app = FastAPI()
client = OpenAI()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    data = await websocket.receive_text()
    messages = [{"role": "system", "content": system_prompt}] + json.loads(data)

    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        stream=True,
    )

    for chunk in stream:
        if chunk.choices[0].delta.content is not None:
            await websocket.send_text(chunk.choices[0].delta.content)

    await websocket.close()
