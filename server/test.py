from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline
from PIL import Image
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permitir cualquier origen (necesario para Ionic)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipe = pipeline("image-classification", model="imzynoxprince/pokemons-image-classifier-gen1-gen9")

@app.post("/")
async def classify_image(file: UploadFile = File(None), url: str = Form(None)):
    """
    Clasifica una imagen enviada como archivo o URL para identificar el Pokémon.
    
    @param {UploadFile} file Archivo de imagen opcional a clasificar.
    @param {str} url URL opcional de la imagen a clasificar.
    @returns {dict} JSON con el resultado de la inferencia.
    """
    try:
        if file:
            image_data = await file.read()
            image = Image.open(io.BytesIO(image_data))
            result = pipe(image)
        elif url:
            result = pipe(url)
        else:
            raise HTTPException(status_code=400, detail="Debes proveer un archivo de imagen o una URL")
        
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))