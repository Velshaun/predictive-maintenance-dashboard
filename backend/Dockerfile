FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway (and other PaaS) injects $PORT at runtime.
# Fall back to 8000 for local Docker usage.
ARG PORT=8000
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
