FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .

RUN pip install --no-cache-dir .

COPY src/ ./src/

ENV WORKERS=1

EXPOSE 8085

# Set the entrypoint
CMD ["fastapi", "run", "--workers", "1", "src/main.py", "--host", "0.0.0.0", "--port", "8085"]
