FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxcb1 \
    libxkbcommon0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libcairo2 \
    libcairo-gobject2 \
    build-essential \
    python3-dev \
    xclip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
COPY install_dependencies.sh .
COPY entrypoint.sh .

# Install wheel first and upgrade pip
RUN pip install --upgrade pip && \
    pip install wheel

# Install pyperclip
RUN pip install --upgrade pip wheel setuptools
RUN pip install pyperclip>=1.9.0

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Make scripts executable
RUN chmod +x install_dependencies.sh entrypoint.sh

# Set environment variable for Playwright browsers path
ENV PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers

# Expose the port the app runs on
EXPOSE 9000

ENTRYPOINT ["/app/entrypoint.sh"]
