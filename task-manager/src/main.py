from fastapi import FastAPI
from utils.main import redis_client
from generate_tests.generate_tests_for_acceptance_criteria import router as generate_tests_for_acceptance_criteria_router


app = FastAPI()

app.include_router(generate_tests_for_acceptance_criteria_router)


@app.post("/auth/store-credentials")
async def store_credentials(product_id: str, username: str, password: str):
    redis_client.set(product_id + ':username', username)
    redis_client.set(product_id + ':password', password)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8002)
