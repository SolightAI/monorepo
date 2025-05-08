FROM python:3.11-slim

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y git \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libcups2 \
    libxss1 \
    libxshmfence1 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

WORKDIR /app

# Install wheel before anything else
RUN pip install --no-cache-dir --upgrade pip wheel setuptools

# Copy requirements first for better caching
COPY requirements.txt .

# Install requirements
RUN pip install --no-cache-dir -r requirements.txt

# TODO remove (just to modify a layer)
RUN ls

COPY fix_browser_use.py /app/fix_browser_use.py
RUN python /app/fix_browser_use.py

# Copy the rest of the application
COPY src/ /app/src/
COPY install_dependencies.sh /app/install_dependencies.sh
COPY entrypoint.sh /app/entrypoint.sh

# Make sure entrypoint script is executable
RUN chmod +x /app/entrypoint.sh
RUN chmod +x /app/install_dependencies.sh

# Expose the port the app runs on
EXPOSE 8001

WORKDIR /app/

# Set environment variable for Playwright browsers path
ENV PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers

# Use the entrypoint script to run the application
CMD ["/app/entrypoint.sh"]
