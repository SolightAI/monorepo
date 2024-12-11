import json

from openai import OpenAI
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from system_prompt import system_prompts


app = FastAPI()
client = OpenAI()

# Update origins to include any additional frontend URLs you need
origins = [
    "http://localhost:3000",
    "https://publisher.demo.laneo.io",
    # Add any other allowed origins
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# FIXME: ça, ça drevrait juste être un wrapper ChatGPT, ça devrait pas intégrer les ads
# Aussi, pour les ads pas besoin de faire un stream, un REST api devrait suffire
@app.websocket("/ws/{type}")
async def websocket_endpoint(websocket: WebSocket, type: str = "native"):
    # Add CORS headers for WebSocket handshake
    if websocket.headers.get("origin") in origins:
        try:
            await websocket.accept()

            if type not in system_prompts:
                await websocket.close(code=4000, reason="Invalid ad type")
                return

            data = await websocket.receive_text()
            messages = json.loads(data)

            try:

                stream = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    stream=True,
                )

                gpt_response = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content is not None:
                        gpt_response += chunk.choices[0].delta.content
                        await websocket.send_text(chunk.choices[0].delta.content)

                if type == "boxed":
                    await websocket.send_text("<BOXED>")
                elif type == "queries":
                    await websocket.send_text("<QUERY>")

                stream = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages + [{"role": "assistant", "content": gpt_response}] + [{"role": "system", "content": system_prompts[type]}],
                    stream=True,
                )

                for chunk in stream:
                    if chunk.choices[0].delta.content is not None:
                        await websocket.send_text(chunk.choices[0].delta.content)

            except Exception as e:
                print(f"Error during streaming: {e}")
                await websocket.close(code=1011, reason="Server error during streaming")
                return

            await websocket.close(code=1000)

        except WebSocketDisconnect:
            print("Client disconnected")
        except Exception as e:
            print(f"Unexpected error: {e}")
            try:
                await websocket.close(code=1011)
            except:
                pass
