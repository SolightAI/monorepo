FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .

RUN pip install --no-cache-dir .

COPY src/ ./src/

COPY *.py ./

EXPOSE 8000

CMD ["fastapi", "dev", "src/main.py", "--host", "0.0.0.0", "--port", "8000"]
