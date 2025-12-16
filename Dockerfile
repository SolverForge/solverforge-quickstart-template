# SolverForge Quickstart Dockerfile
# Compatible with HuggingFace Spaces (Docker SDK)

FROM python:3.12

# Install JDK 21 (required for solverforge-legacy)
RUN apt-get update && \
    apt-get install -y wget gnupg2 && \
    wget -O- https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor > /usr/share/keyrings/adoptium-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/adoptium-archive-keyring.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" > /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && \
    apt-get install -y temurin-21-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

# Install the application
RUN pip install --no-cache-dir -e .

# HuggingFace Spaces uses port 7860 by default
# Our app uses 8080 internally, we'll configure uvicorn to use 7860
ENV PORT=7860

# Expose port
EXPOSE 7860

# Run the application (HuggingFace compatible)
CMD ["python", "-m", "uvicorn", "my_quickstart:app", "--host", "0.0.0.0", "--port", "7860"]
