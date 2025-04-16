FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .

RUN pip install --no-cache-dir .

COPY src/ ./src/

COPY migrations/ ./migrations/

COPY *.py ./

ENV WORKERS=1

EXPOSE 8000

CMD fastapi run --workers ${WORKERS} src/main.py --host 0.0.0.0 --port 8000
