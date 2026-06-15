import { Component, inject, OnInit } from '@angular/core';
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
export class HomePage implements OnInit {

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
  mode: 'list' | 'stats' | 'moves' = 'list';
  levelMoves: {name: string, level: number}[] = [];

  constructor() {}

  /**
   * Inicializa el componente cargando la lista y seleccionando el primer pokemon
   */
  async ngOnInit(){
    await this.load();
    await this.selectPoke();
  }

  /**
   * Obtiene los datos del pokemon seleccionado actualmente
   */
  async selectPoke(){
    const loader = await this.appSrv.showLoader('Obteniendo datos...');
    try {
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
      };

      this.levelMoves = this.currentPoke.moves.map(m => {
        const levelDetail = m.version_group_details.find(v => v.move_learn_method.name === 'level-up');
        return {
          name: m.move.name,
          level: levelDetail ? levelDetail.level_learned_at : 0
        };
      }).filter(m => m.level > 0).sort((a, b) => a.level - b.level);
    } finally {
      loader.dismiss();
    }
  }

  /**
   * Cambia el pokemon seleccionado y obtiene sus datos
   * @param i Indice del pokemon en la lista
   */
  async change(i:number){
    this.selected = i;
    await this.selectPoke();
    await this.talk();
  }

  /**
   * Carga la lista inicial de pokemons
   */
  async load(){
    const pokesReq = await this.appSrv.api.listPokemons(0,905);
    this.pokeList = pokesReq.results;
  }

  /**
   * Reproduce el sonido original del pokemon
   */
  async cry(){
    await this.info?.audio.play();
  }

  /**
   * Reproduce por voz la descripcion del pokemon
   */
  async talk(){
    if(!this.info) return;

    const textoRandom = this.info.texto[Math.floor(Math.random() * this.info.texto.length)];

    let texto = ''+this.currentPoke?.species.name+'. '+this.info.desc+'. ';
    if(this.info.preEvo){
      texto+='Es la forma evolucionada de '+this.info.preEvo+'. '
    }
    texto+=textoRandom;

    texto = texto.replace(/okémon/g, 'okemón');
    console.log(texto);
    await this.tts(texto);
  }

  /**
   * Utiliza el plugin de TTS para leer un texto
   * @param texto Texto a leer
   */
  async tts(texto:string){
    await TextToSpeech.stop();
    await lastValueFrom(timer(100));
    await TextToSpeech.speak({
      text:texto,
      lang:'es-es',
      category: 'ambient',
    });
  }

  /**
   * Cambia el modo de la pantalla inferior entre lista y stats
   */
  toggleStatsMode() {
    this.mode = this.mode === 'stats' ? 'list' : 'stats';
  }

  /**
   * Cambia el modo de la pantalla inferior entre lista y movimientos
   */
  toggleMovesMode() {
    this.mode = this.mode === 'moves' ? 'list' : 'moves';
  }
}
