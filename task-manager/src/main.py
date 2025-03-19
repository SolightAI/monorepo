from fastapi import FastAPI
from generate_tests.generate_tests_for_feature import router as generate_tests_router
from run_tests.run_test import router as run_test_router
from utils.crypto_router import router as crypto_router
from generate_user_stories.generate_user_stories import router as generate_user_stories_router


app = FastAPI()

app.include_router(generate_tests_router)
app.include_router(run_test_router)
app.include_router(crypto_router)
app.include_router(generate_user_stories_router)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, port=9001)
