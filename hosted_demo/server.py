import os
import json

from openai import OpenAI
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from system_prompt import system_prompt


DEMO_INFERENCE_WEBSOCKET_URL = os.getenv("DEMO_INFERENCE_WEBSOCKET_URL")


app = FastAPI()
client = OpenAI()


html = """
<!DOCTYPE html>
<html>
    <head>
        <title>Chat</title>
    </head>
    <body>
        <h1>WebSocket Chat</h1>
        <form action="" onsubmit="sendMessage(event)">
            <input type="text" id="messageText" autocomplete="off"/>
            <button>Send</button>
        </form>
        <ul id='messages'>
        </ul>
        <script>
            var ws = new WebSocket("{DEMO_INFERENCE_WEBSOCKET_URL}");
            ws.onmessage = function(event) {
                var messages = document.getElementById('messages')
                var message = document.createElement('li')
                var content = document.createTextNode(event.data)
                message.appendChild(content)
                messages.appendChild(message)
            };
            function sendMessage(event) {
                var input = document.getElementById("messageText")
                ws.send(input.value)
                input.value = ''
                event.preventDefault()
            }
        </script>
    </body>
</html>
""".format(DEMO_INFERENCE_WEBSOCKET_URL=DEMO_INFERENCE_WEBSOCKET_URL)


@app.get("/")
async def get():
    return HTMLResponse(html)


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
