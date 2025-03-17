from fastapi import FastAPI
from generate_tests.generate_tests_for_acceptance_criteria import router as generate_tests_for_acceptance_criteria_router


app = FastAPI()

app.include_router(generate_tests_for_acceptance_criteria_router)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=9000)
