import { Component, inject } from '@angular/core';
import { AppService } from '../services/app.service';
import { NamedAPIResource, Pokemon } from 'pokenode-ts';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { lastValueFrom, timer } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {

  appSrv = inject(AppService);
  selected = 0;
  pokeList:NamedAPIResource[]=[];
  currentPoke:Pokemon|undefined = undefined;
  info:{
    texto:string[],
    audio:HTMLAudioElement,
    desc:string
    preEvo?:string
  }|undefined;
  constructor() {}

  async ngOnInit(){
    await this.load();
    this.selectPoke();
  }

  async selectPoke(){
    const loader = await this.appSrv.showLoader('Obteniendo datos...');

    const pokeRes = this.pokeList[this.selected];
    const pokeData = await this.appSrv.api.getPokemonByName(pokeRes.name);
    this.currentPoke = pokeData;
    const especies = await this.appSrv.api.getPokemonSpeciesById(this.currentPoke.id);

    const textos = especies.flavor_text_entries.filter(i => i.language.name == 'es').map(i => i.flavor_text);
    this.info = {
      texto: textos,
      audio:new Audio((this.currentPoke as any).cries.latest),
      desc:especies.genera.find(i => i.language.name=='es')?.genus??'',
      preEvo:especies.evolves_from_species?.name??undefined
    }
    loader.dismiss();
  }

  async change(i:number){
    this.selected = i;
    await this.selectPoke();
    this.talk();
  }

  async load(){
    const pokesReq = await this.appSrv.api.listPokemons(0,151);
    this.pokeList = pokesReq.results;
  }

  async cry(){
    this.info?.audio.play();
  }

  async talk(){
    if(!this.info) return;

    const textoRandom = this.info.texto[Math.floor(Math.random() * this.info.texto.length)];

    let texto = ''+this.currentPoke?.name+'. '+this.info.desc+'. ';
    if(this.info.preEvo){
      texto+='Es la forma evolucionada de '+this.info.preEvo+'. '
    }
    texto+=textoRandom;

    texto = texto.replace(/okémon/g, 'okemón');
    console.log(texto);
    this.tts(texto);
  }

  async tts(texto:string){
    await TextToSpeech.stop();
    await lastValueFrom(timer(100));
    TextToSpeech.speak({
      text:texto,
      lang:'es-es',
      category: 'ambient',
    })
  }

  async talkTypes(){
    if(!this.currentPoke) return;
    const tipos = this.currentPoke.types;

    let texto = this.currentPoke.name+' es de tipo '+tipos[0].type.name;
    if(tipos.length>1){
      texto+=' y '+tipos[1].type.name;
    }
    this.tts(texto);
  }
}
