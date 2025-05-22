import { Injectable } from "@angular/core";
import { LoadingController } from "@ionic/angular";
import { PokemonClient } from 'pokenode-ts';


@Injectable({
    providedIn:'root'
})
export class AppService{

    api:PokemonClient;
    constructor(private loadinCtrl:LoadingController){
        this.api = new PokemonClient();
    }


    async showLoader(msg:string){
        const loader = await this.loadinCtrl.create({message:msg,duration:99999999,backdropDismiss:false});
        await loader.present();
        return loader;
    }
}