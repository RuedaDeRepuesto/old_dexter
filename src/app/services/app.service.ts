import { Injectable, inject } from "@angular/core";
import { LoadingController } from "@ionic/angular";
import { PokemonClient } from 'pokenode-ts';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface PokemonClassificationResult {
  label: string;
  score: number;
}

@Injectable({
    providedIn:'root'
})
export class AppService{

    api:PokemonClient;
    private readonly http = inject(HttpClient);
    private readonly loadinCtrl = inject(LoadingController);

    private readonly CLOUD_RUN_API_URL = 'https://clasificador-pokemon-585351811529.us-central1.run.app/';

    constructor(){
        this.api = new PokemonClient();
    }


    /**
     * Muestra un loader en pantalla
     * @param msg Mensaje a mostrar
     * @returns Instancia del loader
     */
    async showLoader(msg:string){
        const loader = await this.loadinCtrl.create({message:msg,duration:99999999,backdropDismiss:false});
        await loader.present();
        return loader;
    }

    /**
     * Identifica un pokemon a partir de un archivo de imagen utilizando nuestro servidor en Cloud Run
     * @param imageBlob Blob de la imagen capturada por la cámara
     * @returns El nombre del Pokemon identificado (en minúsculas)
     */
    async identifyPokemon(imageBlob: Blob): Promise<string> {
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.jpg');

        const request$ = this.http.post<{result: PokemonClassificationResult[]}>(
            this.CLOUD_RUN_API_URL, 
            formData
        );
        
        const response = await lastValueFrom(request$);
        const topResult = response.result.sort((a, b) => b.score - a.score)[0];
        
        return topResult.label.toLowerCase();
    }
}