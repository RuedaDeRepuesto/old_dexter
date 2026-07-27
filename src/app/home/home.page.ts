import { Component, inject, OnInit } from '@angular/core';
import { AppService } from '../services/app.service';
import { NamedAPIResource, Pokemon } from 'pokenode-ts';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { lastValueFrom, timer } from 'rxjs';

/** Detalle enriquecido de un movimiento de nivel */
interface MoveDetail {
  name: string;
  level: number;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: string;
  damageClass: string;
  loaded: boolean;
}

/** Detalle de una habilidad con descripción */
interface AbilityDetail {
  name: string;
  isHidden: boolean;
  description: string;
  loaded: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  appSrv = inject(AppService);

  selected = 0;
  pokeList: NamedAPIResource[] = [];
  currentPoke: Pokemon | undefined = undefined;

  info: {
    texto: string[];
    audio: HTMLAudioElement;
    desc: string;
    preEvo?: string;
  } | undefined;

  mode: 'list' | 'detail' = 'list';
  detailTab: 'stats' | 'moves' | 'ability' = 'stats';

  levelMoves: { name: string; level: number }[] = [];
  moveDetails: MoveDetail[] = [];
  movesLoadedCount = 0;
  movesLoaded = false;
  movesLoading = false;

  abilityDetails: AbilityDetail[] = [];
  abilitiesLoaded = false;

  readonly statLabels: Record<string, string> = {
    'hp': 'HP',
    'attack': 'ATK',
    'defense': 'DEF',
    'special-attack': 'SP.ATK',
    'special-defense': 'SP.DEF',
    'speed': 'VEL',
  };

  constructor() {}

  /** Inicializa el componente cargando la lista de pokemon */
  async ngOnInit() {
    await this.load();
    await this.selectPoke();
  }

  /** Obtiene y carga todos los datos del pokemon seleccionado actualmente */
  async selectPoke() {
    const loader = await this.appSrv.showLoader('Obteniendo datos...');
    try {
      const pokeRes = this.pokeList[this.selected];
      const pokeData = await this.appSrv.api.getPokemonByName(pokeRes.name);
      this.currentPoke = pokeData;

      const especies = await this.appSrv.api.getPokemonSpeciesById(this.currentPoke.id);
      const textos = especies.flavor_text_entries
        .filter(i => i.language.name === 'es')
        .map(i => i.flavor_text);

      this.info = {
        texto: textos,
        audio: new Audio((this.currentPoke as any).cries.latest),
        desc: especies.genera.find(i => i.language.name === 'es')?.genus ?? '',
        preEvo: especies.evolves_from_species?.name ?? undefined,
      };

      this.levelMoves = this.currentPoke.moves
        .map(m => {
          const vgDetail = m.version_group_details.find(
            v => v.move_learn_method.name === 'level-up'
          );
          return { name: m.move.name, level: vgDetail ? vgDetail.level_learned_at : 0 };
        })
        .filter(m => m.level > 0)
        .sort((a, b) => a.level - b.level);

      this.moveDetails = this.levelMoves.map(m => ({
        name: m.name,
        level: m.level,
        power: null,
        accuracy: null,
        pp: null,
        type: '',
        damageClass: '',
        loaded: false,
      }));

      this.abilityDetails = this.currentPoke.abilities.map(a => ({
        name: a.ability.name,
        isHidden: a.is_hidden,
        description: '',
        loaded: false,
      }));

      this.movesLoaded = false;
      this.movesLoading = false;
      this.abilitiesLoaded = false;
      this.movesLoadedCount = 0;
    } finally {
      loader.dismiss();
    }
  }

  /** Carga la lista inicial de pokemons */
  async load() {
    const pokesReq = await this.appSrv.api.listPokemons(0, 905);
    this.pokeList = pokesReq.results;
  }

  /**
   * Selecciona un pokemon de la lista, carga sus datos y navega al detalle
   * @param i Índice del pokemon en la lista
   */
  async change(i: number) {
    this.selected = i;
    await this.selectPoke();
    this.mode = 'detail';
    this.detailTab = 'stats';
    await this.talk();
  }

  /** Vuelve al modo de lista de pokemon */
  goToList() {
    this.mode = 'list';
  }

  /**
   * Cambia el tab activo en la vista de detalle y dispara carga lazy de datos si corresponde
   * @param tab Tab a activar
   */
  setDetailTab(tab: 'stats' | 'moves' | 'ability') {
    this.detailTab = tab;

    if (tab === 'moves' && !this.movesLoaded && !this.movesLoading) {
      this.movesLoading = true;
      this.loadMoveDetails().then(() => {
        this.movesLoading = false;
        this.movesLoaded = true;
      });
    }

    if (tab === 'ability' && !this.abilitiesLoaded) {
      this.abilitiesLoaded = true;
      this.loadAbilityDetails();
    }
  }

  /** Carga los detalles de todos los movimientos de forma progresiva en batches de 8 */
  async loadMoveDetails() {
    const BATCH_SIZE = 8;

    for (let i = 0; i < this.moveDetails.length; i += BATCH_SIZE) {
      await Promise.all(
        this.moveDetails.slice(i, i + BATCH_SIZE).map(async (_, batchIdx) => {
          const idx = i + batchIdx;
          try {
            const detail = await this.appSrv.moveApi.getMoveByName(this.moveDetails[idx].name);
            this.moveDetails[idx] = {
              ...this.moveDetails[idx],
              power: detail.power,
              accuracy: detail.accuracy,
              pp: detail.pp,
              type: detail.type.name,
              damageClass: detail.damage_class?.name ?? 'status',
              loaded: true,
            };
          } catch {
            this.moveDetails[idx] = { ...this.moveDetails[idx], loaded: true };
          }
          this.movesLoadedCount++;
        })
      );
      this.moveDetails = [...this.moveDetails];
    }
  }

  /** Carga las descripciones de las habilidades del pokemon actual */
  async loadAbilityDetails() {
    await Promise.all(
      this.abilityDetails.map(async (ability, idx) => {
        try {
          const detail = await this.appSrv.api.getAbilityByName(ability.name);
          const desc =
            detail.flavor_text_entries.find(e => e.language.name === 'es')?.flavor_text ??
            detail.flavor_text_entries.find(e => e.language.name === 'en')?.flavor_text ??
            '';
          this.abilityDetails[idx] = {
            ...this.abilityDetails[idx],
            description: desc.replace(/\n/g, ' '),
            loaded: true,
          };
        } catch {
          this.abilityDetails[idx] = { ...this.abilityDetails[idx], loaded: true };
        }
      })
    );
    this.abilityDetails = [...this.abilityDetails];
  }

  /** Reproduce el cry del pokemon actual */
  async cry() {
    await this.info?.audio.play();
  }

  /** Reproduce por voz la descripción del pokemon en español */
  async talk() {
    if (!this.info) return;

    const textoRandom = this.info.texto[Math.floor(Math.random() * this.info.texto.length)];
    let texto = this.currentPoke?.species.name + '. ' + this.info.desc + '. ';
    if (this.info.preEvo) texto += 'Es la forma evolucionada de ' + this.info.preEvo + '. ';
    texto += textoRandom;
    texto = texto.replace(/okémon/g, 'okemón');
    await this.tts(texto);
  }

  /**
   * Usa el plugin TTS para leer texto
   * @param texto Texto a sintetizar
   */
  async tts(texto: string) {
    await TextToSpeech.stop();
    await lastValueFrom(timer(100));
    await TextToSpeech.speak({ text: texto, lang: 'es-es', category: 'ambient' });
  }

  /** Abre la cámara, identifica el Pokémon fotografiado y navega a su detalle */
  async scanPokemon() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (!image.base64String) return;

      const loader = await this.appSrv.showLoader('Analizando imagen...');
      try {
        const byteCharacters = atob(image.base64String);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: `image/${image.format}` });
        const pokemonName = await this.appSrv.identifyPokemon(blob);
        const index = this.pokeList.findIndex(p => p.name.toLowerCase() === pokemonName);

        if (index !== -1) {
          await this.change(index);
        } else {
          alert(`No se encontró al Pokémon "${pokemonName}" en la Pokédex.`);
        }
      } finally {
        loader.dismiss();
      }
    } catch (e) {
      console.error('Error al usar la cámara:', e);
    }
  }

  /**
   * Retorna la clase CSS de color para la barra de stat
   * @param value Valor del stat base
   * @returns Clase CSS correspondiente
   */
  getStatClass(value: number): string {
    if (value >= 100) return 'stat-excellent';
    if (value >= 70) return 'stat-good';
    if (value >= 45) return 'stat-average';
    return 'stat-poor';
  }

  /**
   * Retorna el porcentaje de la barra de stat respecto al máximo (255)
   * @param value Valor del stat base
   * @returns Porcentaje como string CSS
   */
  getStatPercent(value: number): string {
    return Math.min((value / 255) * 100, 100).toFixed(1) + '%';
  }

  /** Total de stats base del pokemon actual */
  get totalStats(): number {
    return this.currentPoke?.stats.reduce((sum, s) => sum + s.base_stat, 0) ?? 0;
  }

  /**
   * Formatea el nombre de un movimiento o habilidad (hyphen → espacio, uppercase)
   * @param name Nombre original del API
   * @returns Nombre formateado para mostrar
   */
  formatName(name: string): string {
    return name.split('-').join(' ').toUpperCase();
  }

  /**
   * Retorna la abreviatura de 3 letras para la categoría de daño de un movimiento
   * @param dc Damage class del movimiento (physical | special | status)
   * @returns Abreviatura
   */
  getDmgClassLabel(dc: string): string {
    if (dc === 'physical') return 'FIS';
    if (dc === 'special') return 'ESP';
    return 'EST';
  }
}
