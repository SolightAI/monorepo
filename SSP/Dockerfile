FROM python:3.12-slim

# Copy uv binary from astral-sh/uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

WORKDIR /app

COPY uv.lock /app/
COPY pyproject.toml /app/

RUN uv sync --frozen --no-dev --compile-bytecode

# Copy the current directory contents into the container at /app
COPY ./ /app/

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run app.py when the container launches
CMD ["uv", "run", "main.py"]
