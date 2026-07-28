# Retro Pokédex (POC)

![Retro Pokedex](src/assets/icon.png)

Esta es una pequeña Prueba de Concepto (POC) con **fines puramente educativos**, desarrollada con Angular, Ionic y Capacitor. Su objetivo principal es demostrar la integración de APIs públicas y capacidades de hardware en aplicaciones web (PWA) de una manera divertida y nostálgica.

## 🚀 Características

- **Estética Retro**: Una interfaz gráfica pixel-art que simula a la perfección el sentimiento de los dispositivos portátiles de primera generación de Pokémon, completa con tipografías clásicas y pantallas LCD verdes.
- **Integración con PokéAPI**: Uso de la librería `pokenode-ts` para obtener datos reales y actualizados de los Pokémon (estadísticas, tipos, habilidades, movimientos).
- **Reconocimiento por Cámara con IA**: Usa tu cámara web o la de tu celular para capturar fotos e identificar qué Pokémon es usando un modelo de *Image Classification* montado sobre un backend Python en FastAPI (Hugging Face transformers).
- **Síntesis de Voz (TTS)**: ¡La Pokédex habla! Al buscar o analizar un Pokémon, lee en voz alta la información principal usando la API nativa del dispositivo (`@capacitor-community/text-to-speech`).
- **PWA Ready**: Optimizada para ser instalada y ejecutada directamente desde el navegador (con soporte total para uso de cámara web vía `@ionic/pwa-elements`).

## 🛠 Tecnologías Utilizadas

- **Frontend**: Angular 19, Ionic Framework, SCSS
- **Hardware/PWA**: Capacitor (Camera, TextToSpeech, PWA Elements)
- **Backend / IA**: Python, FastAPI, Hugging Face Transformers (`imzynoxprince/pokemons-image-classifier-gen1-gen9`)
- **Datos**: [PokéAPI](https://pokeapi.co/)

---
*Nota: Todos los diseños, personajes e información de Pokémon pertenecen a Nintendo, Game Freak y The Pokémon Company. Este proyecto es open-source, educativo y sin ánimos de lucro.*
