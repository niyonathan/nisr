FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
COPY app ./app
COPY models ./models
COPY data/public ./data/public
EXPOSE 8000
CMD ["uvicorn", "src.harvestgap.api:app", "--host", "0.0.0.0", "--port", "8000"]
