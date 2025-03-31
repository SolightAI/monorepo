FROM python:3.11-slim

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y git \
    && apt-get clean

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Just install pip and requirements, Playwright will be installed at runtime
RUN pip install -U pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY src/ /app/src/
COPY entrypoint.sh /app/entrypoint.sh

# Make sure entrypoint script is executable
RUN chmod +x /app/entrypoint.sh

# Expose the port the app runs on
EXPOSE 9000

WORKDIR /app/src

# Set environment variable for Playwright browsers path
ENV PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers

# Use the entrypoint script to run the application
CMD ["/app/entrypoint.sh"]
