from fastapi import FastAPI
from generate_tests.generate_tests_for_feature import router as generate_tests_router
from run_tests.run_test import router as run_test_router
from utils.crypto_router import router as crypto_router
from generate_user_stories.generate_user_stories import router as generate_user_stories_router
from generate_acceptance_criteria.generate_acceptance_criteria import router as generate_acceptance_criteria_router
from generate_features.generate_features import router as generate_features_router
from generate_epics.generate_epics import router as generate_epics_router


app = FastAPI()

app.include_router(generate_tests_router)
app.include_router(run_test_router)
app.include_router(crypto_router)
app.include_router(generate_user_stories_router)
app.include_router(generate_acceptance_criteria_router)
app.include_router(generate_features_router)
app.include_router(generate_epics_router)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, port=9001)
