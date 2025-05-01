FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .

RUN pip install --no-cache-dir .

COPY src/ ./src/

COPY migrations/ ./migrations/

# Copy the entrypoint script
COPY entrypoint.sh .

# Make the entrypoint script executable
RUN chmod +x ./entrypoint.sh

ENV WORKERS=1

EXPOSE 8000

# Set the entrypoint
CMD ["./entrypoint.sh"]
