FROM python:3.11-slim

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y git

WORKDIR /app

RUN pip install -U pip

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN playwright install && playwright install-deps

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 8001

WORKDIR /app/src

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
