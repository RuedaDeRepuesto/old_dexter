# Usamos una imagen ligera de Python
FROM python:3.12-slim

# Configuraciones para optimizar Python en Docker
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo
WORKDIR /app

# Copiamos primero el archivo de dependencias
COPY requirements.txt .

# Truco crítico para Cloud Run: 
# Instalamos la versión "CPU-only" de PyTorch. Si instalamos la versión normal, 
# la imagen pesará más de 2.5 GB (por las librerías CUDA para tarjetas gráficas), 
# lo cual haría el despliegue a Cloud Run muy lento y problemático.
RUN sed -i '/^torch==/d' requirements.txt && \
    sed -i '/^torchvision==/d' requirements.txt && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copiamos el resto del código de la aplicación
COPY . .

# Cloud Run utiliza el puerto 8080 por defecto
EXPOSE 8080

# Comando para iniciar el servidor FastAPI
CMD ["uvicorn", "test:app", "--host", "0.0.0.0", "--port", "8080"]
