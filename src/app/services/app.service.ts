import { Injectable, inject } from "@angular/core";
import { LoadingController } from "@ionic/angular";
import { PokemonClient, MoveClient } from 'pokenode-ts';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface PokemonClassificationResult {
    label: string;
    score: number;
}

@Injectable({
    providedIn: 'root'
})
export class AppService {

    api: PokemonClient;
    moveApi: MoveClient;

    private readonly http = inject(HttpClient);
    private readonly loadinCtrl = inject(LoadingController);

    private readonly CLOUD_RUN_API_URL = 'https://dev.matiivilla.cl/jorge';

    constructor() {
        this.api = new PokemonClient();
        this.moveApi = new MoveClient();
    }

    /**
     * Muestra un loader en pantalla
     * @param msg Mensaje a mostrar en el loader
     * @returns Instancia del loader presentado
     */
    async showLoader(msg: string) {
        const loader = await this.loadinCtrl.create({ message: msg, duration: 99999999, backdropDismiss: false });
        await loader.present();
        return loader;
    }

    /**
     * Identifica un pokemon a partir de un blob de imagen usando el servidor Cloud Run
     * @param imageBlob Blob de la imagen capturada por la cámara
     * @returns Resultado de clasificación con label y score
     */
    async identifyPokemon(imageBlob: Blob): Promise<PokemonClassificationResult> {
        const formData = new FormData();
        formData.append('file', imageBlob, 'image.jpg');

        const request$ = this.http.post<{ result: PokemonClassificationResult[] }>(
            this.CLOUD_RUN_API_URL,
            formData
        );

        const response = await lastValueFrom(request$);
        return response.result.sort((a, b) => b.score - a.score)[0];
    }
}