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

# Install wheel before anything else
RUN pip install --no-cache-dir --upgrade pip wheel setuptools

# Install AWS Lambda Runtime Interface Client
RUN pip install awslambdaric

WORKDIR /var/task

COPY install_dependencies.sh .
RUN chmod +x install_dependencies.sh
RUN ./install_dependencies.sh

# Set environment variable for Playwright browsers path
ENV PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers

COPY requirements.txt ./

# Install requirements
RUN pip install --no-cache-dir -r requirements.txt

COPY src src

# Use AWS Lambda Runtime Interface Client as entrypoint
ENTRYPOINT ["/usr/local/bin/python", "-m", "awslambdaric"]