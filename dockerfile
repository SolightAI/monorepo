FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for some Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create the SQLite database directory and set permissions
RUN mkdir -p /app/data && \
    touch /app/data/auction.db && \
    chmod 777 /app/data/auction.db

# Set environment variables
ENV PYTHONPATH=/app
ENV DATABASE_URL=sqlite:///data/auction.db

# Expose port for FastAPI
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]