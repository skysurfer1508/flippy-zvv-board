
FROM python:3.11-slim

WORKDIR /app

# Installiere System-Dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Kopiere Requirements und installiere Python-Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiere Anwendungscode
COPY . .

# Erstelle notwendige Verzeichnisse
RUN mkdir -p templates static

# Exponiere Port
EXPOSE 6162

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:6162/ || exit 1

# Starte die Anwendung
CMD ["gunicorn", "--bind", "0.0.0.0:6162", "--workers", "2", "--timeout", "120", "app:app"]
