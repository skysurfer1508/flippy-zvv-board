
# Multi-stage build: First stage for building React app
FROM node:18-alpine as frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Second stage: Python backend with React frontend
FROM python:3.11-slim

WORKDIR /app

# Install System-Dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python backend code
COPY app.py .

# Copy built React app from first stage
COPY --from=frontend-build /app/dist ./static

# Create necessary directories
RUN mkdir -p templates

# Expose port
EXPOSE 6162

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:6162/ || exit 1

# Start the application
CMD ["gunicorn", "--bind", "0.0.0.0:6162", "--workers", "2", "--timeout", "120", "app:app"]
