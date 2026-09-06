/**
 * BAKE OR DIE (1989 RETRO ARCADE EDITION)
 * Motor gráfico en Canvas, física de objetos, comanda de pedidos,
 * sintetizador de audio 8-bit y Easter Egg "LINKIDX".
 * 
 * 0 Dependencias externas - Vanilla HTML5/CSS/JavaScript
 */

(function() {
  'use strict';

  /* ==========================================================================
     1. SISTEMA DE AUDIO SINTETIZADO 8-BIT (WEB AUDIO API)
     ========================================================================== */
  class RetroSoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }

    playTone(freq, type = 'square', duration = 0.1, gainVal = 0.15) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        // Ignorar si el contexto no está listo
      }
    }

    playCatch() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      // Arpegio ascendente alegre
      const now = this.ctx.currentTime;
      [440, 554, 659, 880].forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 'triangle', 0.08, 0.12), i * 35);
      });
    }

    playOrderComplete() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      // Fanfarria clásica de victoria
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 'square', 0.14, 0.18), i * 80);
      });
    }

    playWrong() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      // Zumbido grave descendente
      this.playTone(180, 'sawtooth', 0.18, 0.15);
      setTimeout(() => this.playTone(130, 'sawtooth', 0.22, 0.18), 90);
    }

    playHazard() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      // Ruido estridente de alerta/muerte
      const now = this.ctx.currentTime;
      this.playTone(120, 'sawtooth', 0.35, 0.25);
      setTimeout(() => this.playTone(85, 'square', 0.45, 0.3), 80);
    }

    playClockTick() {
      if (!this.enabled) return;
      this.playTone(900, 'sine', 0.03, 0.06);
    }

    playEasterEgg() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      // Fanfarria triunfal de 8-bit estilo créditos
      const melody = [
        { f: 523, d: 0.1 }, { f: 587, d: 0.1 }, { f: 659, d: 0.1 },
        { f: 783, d: 0.15 }, { f: 659, d: 0.1 }, { f: 783, d: 0.1 },
        { f: 1046, d: 0.4 }
      ];
      let delay = 0;
      melody.forEach(item => {
        setTimeout(() => this.playTone(item.f, 'square', item.d, 0.2), delay);
        delay += item.d * 900;
      });
    }
  }

  const sfx = new RetroSoundEngine();

  /* ==========================================================================
     2. DICCIONARIO DE INGREDIENTES Y OBSTÁCULOS
     ========================================================================== */
  const INGREDIENTS = {
    STRAWBERRY: {
      id: 'strawberry',
      name: 'Fresa',
      icon: '🍓',
      isHazard: false,
      color: '#ff2a4b',
      points: 100
    },
    CHOCOLATE: {
      id: 'chocolate',
      name: 'Chocolate',
      icon: '🍫',
      isHazard: false,
      color: '#5c381e',
      points: 120
    },
    EGG: {
      id: 'egg',
      name: 'Huevo',
      icon: '🥚',
      isHazard: false,
      color: '#fff1c5',
      points: 90
    },
    CHERRY: {
      id: 'cherry',
      name: 'Cereza',
      icon: '🍒',
      isHazard: false,
      color: '#e84118',
      points: 110
    },
    MILK: {
      id: 'milk',
      name: 'Leche',
      icon: '🥛',
      isHazard: false,
      color: '#ffffff',
      points: 95
    },
    BUTTER: {
      id: 'butter',
      name: 'Mantequilla',
      icon: '🧈',
      isHazard: false,
      color: '#ffd32a',
      points: 105
    }
  };

  const HAZARDS = {
    COCKROACH: {
      id: 'cockroach',
      name: 'Cucaracha',
      icon: '🪳',
      isHazard: true,
      color: '#633917',
      defeatText: '¡Una cucaracha gigante ha caído en el glaseado del cliente!'
    },
    TRASH: {
      id: 'trash',
      name: 'Bolsa de Basura',
      icon: '🗑️',
      isHazard: true,
      color: '#2f3542',
      defeatText: '¡Una bolsa de basura pestilente contaminó la bandeja repostera!'
    },
    RAT: {
      id: 'rat',
      name: 'Rata de Cocina',
      icon: '🐀',
      isHazard: true,
      color: '#57606f',
      defeatText: '¡Una rata grasienta mordisqueó la masa fresca!'
    }
  };

  // Recetas para el panel "PEDIDO"
  const RECIPES = [
    {
      id: 1,
      name: 'Pastel de Fresa',
      themeColor: '#ff4d6d',
      needs: [
        { item: INGREDIENTS.STRAWBERRY, count: 2 },
        { item: INGREDIENTS.EGG, count: 1 }
      ]
    },
    {
      id: 2,
      name: 'Tarta de Chocolate',
      themeColor: '#794628',
      needs: [
        { item: INGREDIENTS.CHOCOLATE, count: 2 },
        { item: INGREDIENTS.MILK, count: 1 }
      ]
    },
    {
      id: 3,
      name: 'Selva Negra Royale',
      themeColor: '#4a0e17',
      needs: [
        { item: INGREDIENTS.CHERRY, count: 2 },
        { item: INGREDIENTS.CHOCOLATE, count: 1 },
        { item: INGREDIENTS.STRAWBERRY, count: 1 }
      ]
    },
    {
      id: 4,
      name: 'Bizcocho Casero',
      themeColor: '#e1b12c',
      needs: [
        { item: INGREDIENTS.EGG, count: 2 },
        { item: INGREDIENTS.BUTTER, count: 1 },
        { item: INGREDIENTS.MILK, count: 1 }
      ]
    },
    {
      id: 5,
      name: 'Delicia de Cereza',
      themeColor: '#c23616',
      needs: [
        { item: INGREDIENTS.CHERRY, count: 2 },
        { item: INGREDIENTS.BUTTER, count: 1 }
      ]
    }
  ];

  /* ==========================================================================
     3. MOTOR DE DIBUJO VECTORIAL / PIXEL-ART EN CANVAS
     ========================================================================== */

  /**
   * Dibuja un Chef gordito, carismático y pixelado
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x Centro horizontal
   * @param {number} y Base del chef
   * @param {number} walkAnim Ciclo de animación
   * @param {boolean} isHappy Expresión triunfal
   */
  function drawPixelChef(ctx, x, y, walkAnim = 0, isHappy = false) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));

    const bounce = Math.sin(walkAnim) * 3;
    const legOffset = Math.sin(walkAnim) * 4;

    // Sombra en el suelo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Piernas y zapatos negros retro
    ctx.fillStyle = '#1e1d24';
    // Pierna izquierda
    ctx.fillRect(-16, -10 + legOffset, 12, 14);
    // Pierna derecha
    ctx.fillRect(4, -10 - legOffset, 12, 14);
    // Zapatos con brillo
    ctx.fillStyle = '#3c3a47';
    ctx.fillRect(-18, 0 + legOffset, 16, 6);
    ctx.fillRect(2, 0 - legOffset, 16, 6);

    // CUERPO GORDITO (Chubby belly)
    const bodyY = -38 + bounce;
    // Capa base del uniforme de cocinero (blanco marfil)
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(-26, bodyY, 52, 34);
    ctx.fillRect(-22, bodyY - 4, 44, 40);

    // Delantal celeste/retro con bolsillo
    ctx.fillStyle = '#487eb0';
    ctx.fillRect(-18, bodyY + 8, 36, 24);
    // Cinta del delantal
    ctx.fillStyle = '#273c75';
    ctx.fillRect(-22, bodyY + 6, 44, 4);
    // Bolsillo del delantal
    ctx.fillStyle = '#40739e';
    ctx.fillRect(-10, bodyY + 16, 20, 12);
    // Costura del bolsillo (puntos amarillos)
    ctx.fillStyle = '#ffeaa7';
    ctx.fillRect(-9, bodyY + 16, 18, 2);

    // Botones oscuros dobles del uniforme
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(-12, bodyY + 2, 4, 4);
    ctx.fillRect(8, bodyY + 2, 4, 4);

    // Pañuelo rojo al cuello (Classic French/Italian Chef)
    ctx.fillStyle = '#e84118';
    ctx.fillRect(-14, bodyY - 6, 28, 6);
    ctx.fillRect(-6, bodyY, 12, 8); // Nudo

    // CABEZA Y CARA GORDITA
    const headY = bodyY - 24;
    // Tono de piel sonrosada
    ctx.fillStyle = '#ffd1a4';
    ctx.fillRect(-18, headY, 36, 22);
    ctx.fillRect(-14, headY - 4, 28, 28);

    // Papada y mejillas gorditas
    ctx.fillStyle = '#ffb88c';
    ctx.fillRect(-20, headY + 10, 6, 10);
    ctx.fillRect(14, headY + 10, 6, 10);

    // Rubor rosado en mejillas
    ctx.fillStyle = '#ff7675';
    ctx.fillRect(-16, headY + 10, 6, 4);
    ctx.fillRect(10, headY + 10, 6, 4);

    // Ojos vivos
    ctx.fillStyle = '#2f3542';
    if (isHappy) {
      // Ojos cerrados felices tipo arco ^ ^
      ctx.fillRect(-12, headY + 4, 6, 2);
      ctx.fillRect(6, headY + 4, 6, 2);
      ctx.fillRect(-10, headY + 2, 2, 2);
      ctx.fillRect(8, headY + 2, 2, 2);
    } else {
      ctx.fillRect(-12, headY + 4, 5, 5);
      ctx.fillRect(7, headY + 4, 5, 5);
      // Brillo en los ojos
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-11, headY + 4, 2, 2);
      ctx.fillRect(8, headY + 4, 2, 2);
    }

    // Nariz redonda prominente
    ctx.fillStyle = '#f8a5c2';
    ctx.fillRect(-4, headY + 6, 8, 6);

    // BIGOTE PROMINENTE RETRO (Pixel Moustache)
    ctx.fillStyle = '#4a2810';
    ctx.fillRect(-14, headY + 12, 28, 6);
    ctx.fillRect(-18, headY + 10, 6, 6);
    ctx.fillRect(12, headY + 10, 6, 6);
    ctx.fillRect(-10, headY + 16, 6, 3);
    ctx.fillRect(4, headY + 16, 6, 3);

    // BOCA
    if (isHappy) {
      ctx.fillStyle = '#c23616';
      ctx.fillRect(-4, headY + 16, 8, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, headY + 16, 4, 2);
    }

    // GORRO ALTO DE COCINERO (Toque Blanche)
    const hatY = headY - 32;
    // Banda base del gorro
    ctx.fillStyle = '#dcdde1';
    ctx.fillRect(-16, headY - 6, 32, 6);
    // Cuerpo alto del gorro
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-22, hatY + 6, 44, 22);
    // Copete inflado arriba
    ctx.fillRect(-26, hatY, 52, 10);
    ctx.fillRect(-18, hatY - 6, 36, 8);
    // Pliegues de sombra del gorro
    ctx.fillStyle = '#e1e2e6';
    ctx.fillRect(-16, hatY + 4, 4, 18);
    ctx.fillRect(-4, hatY + 2, 4, 20);
    ctx.fillRect(8, hatY + 4, 4, 18);

    // BRAZOS SOSTENIENDO LA BANDEJA METÁLICA
    const armY = bodyY + 4;
    // Brazos con mangas blancas
    ctx.fillStyle = '#f5f6fa';
    ctx.fillRect(-32, armY, 10, 18);
    ctx.fillRect(22, armY, 10, 18);
    // Manos
    ctx.fillStyle = '#ffd1a4';
    ctx.fillRect(-36, armY + 10, 8, 8);
    ctx.fillRect(28, armY + 10, 8, 8);

    // BANDEJA METÁLICA RECEPTORA (Tray / Hitbox visual)
    // Ancho total ~84px, altura 10px
    const trayY = armY + 6;
    ctx.fillStyle = '#718093'; // Base oscura
    ctx.fillRect(-44, trayY, 88, 8);

    ctx.fillStyle = '#dcdde1'; // Brillo superior metálico
    ctx.fillRect(-42, trayY - 2, 84, 4);

    ctx.fillStyle = '#ffffff'; // Destello blanco de borde
    ctx.fillRect(-38, trayY - 2, 28, 2);
    ctx.fillRect(20, trayY - 2, 14, 2);

    // Asas doradas de la bandeja
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-46, trayY - 1, 4, 6);
    ctx.fillRect(42, trayY - 1, 4, 6);

    ctx.restore();
  }

  /**
   * Dibuja un ingrediente pixel-art en el canvas
   */
  function drawIngredientSprite(ctx, itemKey, x, y, size = 32) {
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    const s = size / 32; // Factor de escala

    ctx.scale(s, s);

    switch (itemKey) {
      case 'strawberry':
        // FRESA 🍓
        // Cuerpo rojo
        ctx.fillStyle = '#ff2a4b';
        ctx.fillRect(-10, -8, 20, 12);
        ctx.fillRect(-8, 4, 16, 6);
        ctx.fillRect(-5, 10, 10, 4);
        ctx.fillRect(-2, 14, 4, 3);
        // Sombra lateral
        ctx.fillStyle = '#b80020';
        ctx.fillRect(4, -6, 6, 12);
        ctx.fillRect(2, 6, 4, 4);
        // Semillas amarillas
        ctx.fillStyle = '#ffeaa7';
        ctx.fillRect(-6, -4, 2, 2);
        ctx.fillRect(0, -2, 2, 2);
        ctx.fillRect(4, -4, 2, 2);
        ctx.fillRect(-3, 2, 2, 2);
        ctx.fillRect(3, 4, 2, 2);
        ctx.fillRect(-1, 8, 2, 2);
        // Hojas verdes y tallo
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(-12, -12, 8, 5);
        ctx.fillRect(4, -12, 8, 5);
        ctx.fillRect(-4, -10, 8, 4);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(-2, -16, 4, 6);
        break;

      case 'chocolate':
        // TABLETA DE CHOCOLATE 🍫
        // Envoltorio de aluminio brillante
        ctx.fillStyle = '#dcdde1';
        ctx.fillRect(-12, 2, 24, 12);
        ctx.fillStyle = '#718093';
        ctx.fillRect(-12, 10, 24, 4);
        ctx.fillStyle = '#ff2a4b'; // Cinta roja del empaque
        ctx.fillRect(-12, 4, 24, 3);
        // Bloques de chocolate expuestos
        ctx.fillStyle = '#4a2810';
        ctx.fillRect(-12, -14, 24, 16);
        // Divisiones 3D de los cubos de chocolate
        ctx.fillStyle = '#6f3c1b';
        ctx.fillRect(-10, -12, 9, 6);
        ctx.fillRect(1, -12, 9, 6);
        ctx.fillRect(-10, -4, 9, 6);
        ctx.fillRect(1, -4, 9, 6);
        // Brillo superior
        ctx.fillStyle = '#8e5229';
        ctx.fillRect(-9, -12, 7, 2);
        ctx.fillRect(2, -12, 7, 2);
        break;

      case 'egg':
        // HUEVO 🥚
        // Sombra de huevo
        ctx.fillStyle = '#dcd3b8';
        ctx.fillRect(-8, -12, 16, 24);
        ctx.fillRect(-11, -8, 22, 18);
        ctx.fillRect(-5, -15, 10, 28);
        // Cascarón crema
        ctx.fillStyle = '#fff3cd';
        ctx.fillRect(-9, -12, 16, 22);
        ctx.fillRect(-11, -8, 20, 16);
        ctx.fillRect(-6, -14, 10, 26);
        // Reflejo blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -10, 4, 8);
        ctx.fillRect(-4, -6, 2, 4);
        break;

      case 'cherry':
        // CEREZAS 🍒
        // Cereza izquierda
        ctx.fillStyle = '#c23616';
        ctx.beginPath();
        ctx.arc(-6, 4, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff6b81';
        ctx.fillRect(-8, 1, 3, 3);
        // Cereza derecha
        ctx.fillStyle = '#c23616';
        ctx.beginPath();
        ctx.arc(7, 6, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff6b81';
        ctx.fillRect(5, 3, 3, 3);
        // Tallos curvos
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -3);
        ctx.quadraticCurveTo(-4, -12, 2, -14);
        ctx.moveTo(7, -1);
        ctx.quadraticCurveTo(4, -10, 2, -14);
        ctx.stroke();
        // Hoja verde
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(2, -16, 8, 4);
        ctx.fillRect(4, -14, 6, 3);
        break;

      case 'milk':
        // BOTELLA DE LECHE 🥛
        // Tapa azul
        ctx.fillStyle = '#0984e3';
        ctx.fillRect(-4, -14, 8, 3);
        // Cuello de botella
        ctx.fillStyle = '#dfe4ea';
        ctx.fillRect(-5, -11, 10, 5);
        // Botella de vidrio blanca
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -6, 16, 20);
        // Etiqueta celeste con vaquita pixel
        ctx.fillStyle = '#74b9ff';
        ctx.fillRect(-7, 0, 14, 8);
        ctx.fillStyle = '#2f3542';
        ctx.fillRect(-3, 3, 6, 3);
        break;

      case 'butter':
        // MANTEQUILLA 🧈
        // Plato / papel base
        ctx.fillStyle = '#dcdde1';
        ctx.fillRect(-12, 6, 24, 6);
        // Bloque dorado de mantequilla
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-10, -6, 20, 12);
        // Cara superior iluminada
        ctx.fillStyle = '#f9ca24';
        ctx.fillRect(-10, -10, 18, 5);
        ctx.fillStyle = '#fff200';
        ctx.fillRect(-8, -9, 14, 2);
        break;

      // ================= OBSTÁCULOS =================
      case 'cockroach':
        // CUCARACHA 🪳
        // Patas que se mueven
        ctx.fillStyle = '#3e2723';
        const legWiggle = Math.sin(Date.now() / 80) * 3;
        // 6 Patas finas
        ctx.fillRect(-14, -6 + legWiggle, 6, 2);
        ctx.fillRect(8, -6 - legWiggle, 6, 2);
        ctx.fillRect(-15, 0 - legWiggle, 6, 2);
        ctx.fillRect(9, 0 + legWiggle, 6, 2);
        ctx.fillRect(-14, 6 + legWiggle, 6, 2);
        ctx.fillRect(8, 6 - legWiggle, 6, 2);
        // Cuerpo quitinoso ovalado
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-6, -10, 12, 20);
        ctx.fillRect(-8, -6, 16, 14);
        // Caparazón brillante y segmentos
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-5, -6, 4, 12);
        ctx.fillStyle = '#271c19';
        ctx.fillRect(-6, -2, 12, 2);
        ctx.fillRect(-6, 3, 12, 2);
        // Cabeza y antenas largas
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(-4, -14, 8, 5);
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-2, -14);
        ctx.lineTo(-10 + legWiggle, -22);
        ctx.moveTo(2, -14);
        ctx.lineTo(10 - legWiggle, -22);
        ctx.stroke();
        break;

      case 'trash':
        // BOLSA DE BASURA 🗑️
        // Vapores verdes tóxicos (efecto peste)
        const vapor = Math.sin(Date.now() / 150) * 4;
        ctx.fillStyle = 'rgba(46, 204, 113, 0.6)';
        ctx.fillRect(-8 + vapor, -20, 4, 4);
        ctx.fillRect(4 - vapor, -22, 5, 4);
        ctx.fillRect(0, -25, 4, 3);
        // Nudo de la bolsa y cinta amarilla
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-4, -11, 8, 3);
        ctx.fillStyle = '#2f3640';
        ctx.fillRect(-6, -15, 12, 5);
        // Cuerpo arrugado de la bolsa
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(-12, -8, 24, 20);
        ctx.fillRect(-14, -4, 28, 14);
        // Brillo plástico arrugado
        ctx.fillStyle = '#485460';
        ctx.fillRect(-8, -4, 4, 10);
        ctx.fillRect(4, -6, 5, 6);
        ctx.fillRect(-10, 6, 8, 3);
        break;

      case 'rat':
        // RATA DE COCINA 🐀
        // Cola rosada curva
        ctx.strokeStyle = '#ff9ff3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 4);
        ctx.quadraticCurveTo(-18, 0, -16, -10);
        ctx.stroke();
        // Cuerpo de rata gris
        ctx.fillStyle = '#57606f';
        ctx.fillRect(-10, -4, 18, 12);
        ctx.fillRect(-6, -8, 12, 16);
        // Cabeza puntiaguda
        ctx.fillRect(6, -2, 8, 8);
        ctx.fillRect(12, 0, 4, 4);
        // Hocico rosado
        ctx.fillStyle = '#ff9ff3';
        ctx.fillRect(15, 1, 3, 3);
        // Orejas redondas
        ctx.fillRect(4, -8, 4, 4);
        // Ojo rojo amenazante brillante
        ctx.fillStyle = '#ff3838';
        ctx.fillRect(9, 0, 3, 3);
        // Bigotes
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(14, 2);
        ctx.lineTo(20, -1);
        ctx.moveTo(14, 3);
        ctx.lineTo(20, 5);
        ctx.stroke();
        break;

      default:
        ctx.fillStyle = '#ffeaa7';
        ctx.fillRect(-8, -8, 16, 16);
    }

    ctx.restore();
  }

  /**
   * Dibuja la miniatura del pastel objetivo en el canvas del ticket
   */
  function drawCakePreview(canvas, recipe) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 10;

    // Pedestal o plato plateado
    ctx.fillStyle = '#718093';
    ctx.fillRect(cx - 36, cy + 18, 72, 6);
    ctx.fillStyle = '#dcdde1';
    ctx.fillRect(cx - 32, cy + 16, 64, 3);

    // Piso inferior del pastel
    ctx.fillStyle = recipe.themeColor || '#e1b12c';
    ctx.fillRect(cx - 30, cy - 4, 60, 20);
    // Glaseado/crema intermedio
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 32, cy - 8, 64, 6);

    // Piso superior del pastel
    ctx.fillStyle = recipe.themeColor || '#e1b12c';
    ctx.fillRect(cx - 22, cy - 24, 44, 18);
    // Glaseado superior con gotas que escurren
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 24, cy - 28, 48, 6);
    ctx.fillRect(cx - 20, cy - 22, 6, 6);
    ctx.fillRect(cx + 10, cy - 22, 6, 8);

    // Decoración de frutas en la cima según la receta
    if (recipe.id === 1 || recipe.id === 3) {
      // Fresas en la cima
      drawIngredientSprite(ctx, 'strawberry', cx - 8, cy - 36, 18);
      drawIngredientSprite(ctx, 'strawberry', cx + 8, cy - 36, 18);
    } else if (recipe.id === 2) {
      // Bloques de chocolate
      drawIngredientSprite(ctx, 'chocolate', cx, cy - 36, 20);
    } else if (recipe.id === 5) {
      // Cerezas
      drawIngredientSprite(ctx, 'cherry', cx, cy - 36, 20);
    } else {
      // Vela o flor de azúcar
      ctx.fillStyle = '#ffeaa7';
      ctx.fillRect(cx - 3, cy - 40, 6, 12);
      ctx.fillStyle = '#ff7675';
      ctx.fillRect(cx - 4, cy - 44, 8, 5);
    }
  }

  /* ==========================================================================
     4. LÓGICA PRINCIPAL DEL JUEGO
     ========================================================================== */

  class BakeOrDieGame {
    constructor() {
      // Canvas principal
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.recipeCanvas = document.getElementById('recipeCanvas');
      this.easterEggCanvas = document.getElementById('easterEggCanvas');

      // Elementos del DOM
      this.hudStage = document.getElementById('hud-stage');
      this.hudTime = document.getElementById('hud-time');
      this.hudScore = document.getElementById('hud-score');
      this.hudHiScore = document.getElementById('hud-hiscore');
      this.hudTimeBox = document.querySelector('.hud-time');

      this.ticketId = document.getElementById('ticket-id');
      this.ticketRecipeName = document.getElementById('ticket-recipe-name');
      this.ticketTimerDigits = document.getElementById('ticket-timer-digits');
      this.ticketProgressFill = document.getElementById('ticket-progress-fill');
      this.ingredientsList = document.getElementById('ingredientsList');

      this.defeatOverlay = document.getElementById('defeatOverlay');
      this.defeatReason = document.getElementById('defeatReason');
      this.finalScore = document.getElementById('finalScore');
      this.finalOrders = document.getElementById('finalOrders');
      this.finalStage = document.getElementById('finalStage');
      this.btnRetry = document.getElementById('btnRetry');

      this.easterEggOverlay = document.getElementById('easterEggOverlay');
      this.btnCloseEasterEgg = document.getElementById('btnCloseEasterEgg');
      this.floatBanner = document.getElementById('floatBanner');

      // Botones inferiores
      this.btnLeft = document.getElementById('btnLeft');
      this.btnRight = document.getElementById('btnRight');
      this.btnSound = document.getElementById('btnSound');
      this.btnPause = document.getElementById('btnPause');

      // Estado del juego
      this.stage = 1;
      this.score = 0;
      this.hiScore = 50000;
      this.ordersCompleted = 0;
      this.isGameOver = false;
      this.isPaused = false;

      // Temporizador maestro de 60 segundos
      this.totalTime = 60;
      this.lastTickTime = Date.now();

      // Temporizador de comanda (12 segundos)
      this.orderTimeMax = 12.0;
      this.orderTimeRemaining = 12.0;
      this.currentRecipe = null;
      this.recipeProgress = {}; // key -> { needed, collected }

      // Chef
      this.chef = {
        x: this.canvas.width / 2,
        y: this.canvas.height - 35,
        targetX: this.canvas.width / 2,
        speed: 8,
        width: 84, // Ancho de la bandeja receptora
        height: 70,
        walkAnim: 0,
        isMoving: false,
        happyTimer: 0
      };

      // Control de teclado
      this.keys = { left: false, right: false };

      // Entidades que caen
      this.fallingItems = [];
      this.spawnTimer = 0;
      this.spawnInterval = 45; // fotogramas entre caídas

      // Efectos visuales de partículas
      this.particles = [];

      // Detección del Easter Egg "LINKIDX"
      this.keySequence = [];
      this.secretCode = 'LINKIDX';

      // Inicialización
      this.initEventListeners();
      this.resetGame();
      this.startLoop();
    }

    resetGame() {
      this.stage = 1;
      this.score = 0;
      this.ordersCompleted = 0;
      this.totalTime = 60;
      this.isGameOver = false;
      this.isPaused = false;
      this.fallingItems = [];
      this.particles = [];
      this.chef.x = this.canvas.width / 2;
      this.chef.targetX = this.chef.x;

      this.defeatOverlay.classList.add('hidden');
      this.easterEggOverlay.classList.add('hidden');
      this.hudTimeBox.classList.remove('danger-time');

      this.updateHud();
      this.generateNewOrder();
    }

    /* ==========================================================================
       GESTIÓN DE COMANDAS (12s TIMER & INGREDIENTES)
       ========================================================================== */

    generateNewOrder() {
      // Elegir receta aleatoria
      const recipeIndex = Math.floor(Math.random() * RECIPES.length);
      this.currentRecipe = RECIPES[recipeIndex];
      this.orderTimeRemaining = this.orderTimeMax;

      // Inicializar progreso
      this.recipeProgress = {};
      this.currentRecipe.needs.forEach(req => {
        this.recipeProgress[req.item.id] = {
          item: req.item,
          needed: req.count,
          collected: 0
        };
      });

      // Actualizar vista del ticket
      this.ticketId.textContent = (this.ordersCompleted + 1).toString().padStart(2, '0');
      this.ticketRecipeName.textContent = this.currentRecipe.name;
      drawCakePreview(this.recipeCanvas, this.currentRecipe);
      this.renderTicketChecklist();
    }

    renderTicketChecklist() {
      this.ingredientsList.innerHTML = '';

      Object.values(this.recipeProgress).forEach(entry => {
        const li = document.createElement('li');
        li.className = 'ingredient-item' + (entry.collected >= entry.needed ? ' completed' : '');

        const leftDiv = document.createElement('div');
        leftDiv.className = 'item-left';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'item-icon';
        iconSpan.textContent = entry.item.icon;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = entry.item.name;

        leftDiv.appendChild(iconSpan);
        leftDiv.appendChild(nameSpan);

        const counterSpan = document.createElement('span');
        counterSpan.className = 'item-counter';
        const isDone = entry.collected >= entry.needed;
        counterSpan.innerHTML = isDone 
          ? `<span class="item-check">✓</span> ${entry.collected}/${entry.needed}`
          : `${entry.collected}/${entry.needed}`;

        li.appendChild(leftDiv);
        li.appendChild(counterSpan);
        this.ingredientsList.appendChild(li);
      });
    }

    checkRecipeCompletion() {
      const allFinished = Object.values(this.recipeProgress).every(
        req => req.collected >= req.needed
      );

      if (allFinished) {
        // Pedido completado con éxito
        sfx.playOrderComplete();
        const timeBonus = Math.floor(this.orderTimeRemaining * 30);
        const orderPoints = 500 + timeBonus;
        this.addScore(orderPoints);

        this.ordersCompleted++;
        this.chef.happyTimer = 40;

        // Subir de nivel cada 3 comandas
        if (this.ordersCompleted % 3 === 0) {
          this.stage++;
          this.hudStage.textContent = this.stage.toString().padStart(2, '0');
          this.showBanner(`¡STAGE ${this.stage}! +VELOCIDAD`);
          // Reducir intervalo de spawn para más intensidad
          this.spawnInterval = Math.max(22, 45 - (this.stage * 4));
        } else {
          this.showBanner(`¡PEDIDO SERVIDO! +${orderPoints} PTS`);
        }

        // Generar partículas de celebración
        this.createConfetti(this.chef.x, this.chef.y - 40);

        // Nueva comanda
        this.generateNewOrder();
      }
    }

    showBanner(text) {
      this.floatBanner.textContent = text;
      this.floatBanner.classList.remove('hidden');
      clearTimeout(this.bannerTimeout);
      this.bannerTimeout = setTimeout(() => {
        this.floatBanner.classList.add('hidden');
      }, 1500);
    }

    addScore(points) {
      this.score += points;
      if (this.score > this.hiScore) {
        this.hiScore = this.score;
      }
      this.updateHud();
    }

    updateHud() {
      this.hudScore.textContent = this.score.toString().padStart(6, '0');
      this.hudHiScore.textContent = this.hiScore.toString().padStart(6, '0');
      this.hudTime.textContent = Math.ceil(this.totalTime).toString().padStart(2, '0');
      this.hudStage.textContent = this.stage.toString().padStart(2, '0');

      if (this.totalTime <= 10) {
        this.hudTimeBox.classList.add('danger-time');
      } else {
        this.hudTimeBox.classList.remove('danger-time');
      }
    }

    /* ==========================================================================
       GENERACIÓN DE OBJETOS QUE CAEN (INGREDIENTES Y OBSTÁCULOS)
       ========================================================================== */

    spawnFallingItem() {
      // Probabilidad de obstáculo aumenta con el nivel (entre 25% y 45%)
      const hazardChance = Math.min(0.45, 0.22 + (this.stage * 0.04));
      const isHazard = Math.random() < hazardChance;

      let itemDef;
      if (isHazard) {
        const hazardKeys = Object.keys(HAZARDS);
        const randKey = hazardKeys[Math.floor(Math.random() * hazardKeys.length)];
        itemDef = HAZARDS[randKey];
      } else {
        // Ponderar hacia ingredientes de la receta actual
        const currentRecipeItemIds = Object.keys(this.recipeProgress);
        const pickRecipeItem = Math.random() < 0.65 && currentRecipeItemIds.length > 0;

        if (pickRecipeItem) {
          const randId = currentRecipeItemIds[Math.floor(Math.random() * currentRecipeItemIds.length)];
          itemDef = this.recipeProgress[randId].item;
        } else {
          const ingKeys = Object.keys(INGREDIENTS);
          const randKey = ingKeys[Math.floor(Math.random() * ingKeys.length)];
          itemDef = INGREDIENTS[randKey];
        }
      }

      // Posición X aleatoria respetando márgenes
      const padding = 40;
      const x = padding + Math.random() * (this.canvas.width - padding * 2);
      const speed = 2.8 + Math.random() * 1.5 + (this.stage * 0.4);

      this.fallingItems.push({
        def: itemDef,
        x: x,
        y: -30,
        speed: speed,
        rot: 0,
        rotSpeed: (Math.random() - 0.5) * 0.08,
        scale: 1,
        w: 34,
        h: 34
      });
    }

    /* ==========================================================================
       DETECCIÓN DE COLISIONES Y MANEJO DE ATRAPADAS
       ========================================================================== */

    checkCollisions() {
      // Bandeja del chef (Hitbox)
      const trayWidth = 84;
      const trayHeight = 16;
      const trayX = this.chef.x - trayWidth / 2;
      const trayY = this.chef.y - 34;

      for (let i = this.fallingItems.length - 1; i >= 0; i--) {
        const obj = this.fallingItems[i];

        // Comprobar solapamiento AABB con la bandeja
        if (
          obj.x + obj.w / 2 > trayX &&
          obj.x - obj.w / 2 < trayX + trayWidth &&
          obj.y + obj.h / 2 > trayY &&
          obj.y - obj.h / 2 < trayY + trayHeight
        ) {
          // ¡COLISIÓN DETECTADA!
          this.handleCatch(obj);
          this.fallingItems.splice(i, 1);
          continue;
        }

        // Si cae fuera de pantalla por el suelo
        if (obj.y > this.canvas.height + 40) {
          this.fallingItems.splice(i, 1);
        }
      }
    }

    handleCatch(obj) {
      if (obj.def.isHazard) {
        // ATRAPÓ UN OBSTÁCULO INDESEABLE (CUCARACHA, BASURA, RATA)
        sfx.playHazard();
        this.triggerDefeat(obj.def.defeatText || '¡Un desastre asqueroso ha arruinado la masa!');
        return;
      }

      // Ingrediente normal
      const req = this.recipeProgress[obj.def.id];

      if (req && req.collected < req.needed) {
        // Ingrediente necesario y pendiente
        req.collected++;
        sfx.playCatch();
        this.addScore(obj.def.points || 100);
        this.createIngredientSparks(obj.x, obj.y, obj.def.color);
        this.renderTicketChecklist();
        this.checkRecipeCompletion();
      } else {
        // Ingrediente extra o no requerido por la receta actual
        sfx.playWrong();
        this.addScore(20); // Pequeño consuelo pero no suma a la receta
        this.createIngredientSparks(obj.x, obj.y, '#95a5a6');
      }
    }

    createIngredientSparks(x, y, color) {
      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 5 - 2,
          life: 1.0,
          color: color || '#ffeaa7',
          size: 3 + Math.random() * 3
        });
      }
    }

    createConfetti(x, y) {
      const colors = ['#ffe600', '#ff2a4b', '#00f0ff', '#55ff88', '#ffffff'];
      for (let i = 0; i < 24; i++) {
        this.particles.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 10,
          vy: -Math.random() * 8 - 4,
          life: 1.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 4 + Math.random() * 4
        });
      }
    }

    /* ==========================================================================
       PANTALLA DE DERROTA ("EL CLIENTE HA DICHO QUE ESTO SABE A TRISTEZA")
       ========================================================================== */

    triggerDefeat(reasonText) {
      this.isGameOver = true;
      this.defeatReason.textContent = reasonText;
      this.finalScore.textContent = this.score.toString().padStart(6, '0');
      this.finalOrders.textContent = this.ordersCompleted;
      this.finalStage.textContent = `STAGE ${this.stage.toString().padStart(2, '0')}`;

      this.defeatOverlay.classList.remove('hidden');
    }

    /* ==========================================================================
       EASTER EGG TÉCNICO: "LINKIDX"
       ========================================================================== */

    checkEasterEgg(char) {
      this.keySequence.push(char.toUpperCase());
      if (this.keySequence.length > 10) {
        this.keySequence.shift();
      }

      const currentSeq = this.keySequence.join('');
      if (currentSeq.includes(this.secretCode)) {
        this.keySequence = [];
        this.triggerEasterEgg();
      }
    }

    triggerEasterEgg() {
      sfx.playEasterEgg();
      this.addScore(5000);
      this.easterEggOverlay.classList.remove('hidden');

      // Dibujar chef sonriente en el modal del Easter Egg
      const eCtx = this.easterEggCanvas.getContext('2d');
      eCtx.clearRect(0, 0, this.easterEggCanvas.width, this.easterEggCanvas.height);
      drawPixelChef(eCtx, 40, 70, 0, true);
    }

    /* ==========================================================================
       BUCLE DE JUEGO (GAME LOOP)
       ========================================================================== */

    update(delta) {
      if (this.isGameOver || this.isPaused) return;

      // 1. Temporizador Global de 60s
      this.totalTime -= delta;
      if (this.totalTime <= 0) {
        this.totalTime = 0;
        this.updateHud();
        sfx.playHazard();
        this.triggerDefeat('¡El tiempo se agotó y la cocina cerró sus puertas!');
        return;
      }

      // Parpadeo de sonido en los últimos 10 segundos
      if (this.totalTime <= 10) {
        if (Math.floor(this.totalTime) !== Math.floor(this.totalTime + delta)) {
          sfx.playClockTick();
        }
      }

      // 2. Temporizador de Comanda (12s)
      this.orderTimeRemaining -= delta;
      if (this.orderTimeRemaining <= 0) {
        // Comanda quemada/caducada
        sfx.playWrong();
        this.showBanner('¡TIEMPO DE RECETA AGOTADO! (-100 PTS)');
        this.addScore(-100);
        if (this.score < 0) this.score = 0;
        this.generateNewOrder();
      }

      // Actualizar barra de progreso de la comanda
      const progressPercent = Math.max(0, (this.orderTimeRemaining / this.orderTimeMax) * 100);
      this.ticketProgressFill.style.width = progressPercent + '%';
      this.ticketTimerDigits.textContent = Math.max(0, this.orderTimeRemaining).toFixed(1) + 's';

      if (this.orderTimeRemaining <= 3.5) {
        this.ticketProgressFill.classList.add('rush');
      } else {
        this.ticketProgressFill.classList.remove('rush');
      }

      this.updateHud();

      // 3. Movimiento del Chef
      this.chef.isMoving = false;
      if (this.keys.left) {
        this.chef.x -= this.chef.speed;
        this.chef.isMoving = true;
      }
      if (this.keys.right) {
        this.chef.x += this.chef.speed;
        this.chef.isMoving = true;
      }

      // Si se controla por ratón/touch suave
      if (Math.abs(this.chef.targetX - this.chef.x) > 3) {
        this.chef.x += (this.chef.targetX - this.chef.x) * 0.25;
        this.chef.isMoving = true;
      }

      // Limitar a los bordes del canvas
      const halfTray = this.chef.width / 2;
      if (this.chef.x < halfTray + 8) this.chef.x = halfTray + 8;
      if (this.chef.x > this.canvas.width - halfTray - 8) this.chef.x = this.canvas.width - halfTray - 8;

      if (this.chef.isMoving) {
        this.chef.walkAnim += 0.25;
      } else {
        this.chef.walkAnim = 0;
      }

      if (this.chef.happyTimer > 0) {
        this.chef.happyTimer--;
      }

      // 4. Generación y movimiento de objetos que caen
      this.spawnTimer++;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnFallingItem();
      }

      for (let item of this.fallingItems) {
        item.y += item.speed;
        item.rot += item.rotSpeed;
      }

      this.checkCollisions();

      // 5. Partículas
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // Gravedad
        p.life -= 0.02;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    render() {
      // Limpiar pantalla
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // FONDO RETRO DE COCINA (Mosaicos oscuros y estantería)
      this.drawKitchenBackground();

      // Dibujar objetos que caen
      for (let item of this.fallingItems) {
        this.ctx.save();
        this.ctx.translate(item.x, item.y);
        this.ctx.rotate(item.rot);
        drawIngredientSprite(this.ctx, item.def.id, 0, 0, 32);
        this.ctx.restore();
      }

      // Dibujar partículas
      for (let p of this.particles) {
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, p.life);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        this.ctx.restore();
      }

      // Dibujar Chef
      const isHappy = this.chef.happyTimer > 0;
      drawPixelChef(this.ctx, this.chef.x, this.chef.y, this.chef.walkAnim, isHappy);
    }

    drawKitchenBackground() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Pared con azulejos retro oscuros
      ctx.fillStyle = '#100e17';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#181524';
      ctx.lineWidth = 1;
      const tileSize = 36;
      for (let x = 0; x < w; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 60);
        ctx.stroke();
      }
      for (let y = 0; y < h - 60; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Estante superior con botes de ingredientes
      ctx.fillStyle = '#2c2538';
      ctx.fillRect(20, 70, w - 40, 8);
      ctx.fillStyle = '#473c5c';
      ctx.fillRect(20, 68, w - 40, 2);

      // Frascos decorativos en el estante
      const jars = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7'];
      jars.forEach((col, idx) => {
        ctx.fillStyle = col;
        ctx.fillRect(50 + idx * 45, 52, 14, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(52 + idx * 45, 48, 10, 4);
      });

      // Suelo de baldosas de cocina a cuadros
      const floorY = h - 60;
      ctx.fillStyle = '#221f2d';
      ctx.fillRect(0, floorY, w, 60);
      ctx.fillStyle = '#39344d';
      ctx.fillRect(0, floorY, w, 4); // Borde superior del suelo

      const floorCheckSize = 30;
      for (let x = 0; x < w; x += floorCheckSize) {
        for (let y = floorY + 4; y < h; y += floorCheckSize) {
          if ((Math.floor(x / floorCheckSize) + Math.floor(y / floorCheckSize)) % 2 === 0) {
            ctx.fillStyle = '#171520';
            ctx.fillRect(x, y, floorCheckSize, floorCheckSize);
          }
        }
      }
    }

    startLoop() {
      let lastTime = performance.now();
      const loop = (currentTime) => {
        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        // Limitar delta para evitar saltos si se minimiza la pestaña
        const clampedDelta = Math.min(delta, 0.1);

        this.update(clampedDelta);
        this.render();

        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    /* ==========================================================================
       GESTIÓN DE EVENTOS (TECLADO, TOUCH, RATÓN, EASTER EGG)
       ========================================================================== */

    initEventListeners() {
      // Teclado
      window.addEventListener('keydown', (e) => {
        sfx.init();

        // Registrar para el Easter Egg "LINKIDX"
        if (e.key && e.key.length === 1) {
          this.checkEasterEgg(e.key);
        }

        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.keys.left = true;
          this.chef.targetX = this.chef.x; // Cancelar lerp de ratón
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.keys.right = true;
          this.chef.targetX = this.chef.x;
        } else if (e.code === 'KeyP') {
          this.togglePause();
        } else if (e.code === 'KeyM') {
          this.toggleSound();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          this.keys.left = false;
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          this.keys.right = false;
        }
      });

      // Control con Ratón / Touch en el Canvas
      const handlePointer = (clientX) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const canvasX = (clientX - rect.left) * scaleX;
        this.chef.targetX = canvasX;
      };

      this.canvas.addEventListener('mousemove', (e) => {
        handlePointer(e.clientX);
      });

      this.canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          handlePointer(e.touches[0].clientX);
          e.preventDefault();
        }
      }, { passive: false });

      this.canvas.addEventListener('touchstart', (e) => {
        sfx.init();
        if (e.touches.length > 0) {
          handlePointer(e.touches[0].clientX);
        }
      });

      // Botones virtuales inferiores
      this.btnLeft.addEventListener('mousedown', () => { sfx.init(); this.keys.left = true; });
      this.btnLeft.addEventListener('mouseup', () => { this.keys.left = false; });
      this.btnLeft.addEventListener('touchstart', (e) => { sfx.init(); this.keys.left = true; e.preventDefault(); });
      this.btnLeft.addEventListener('touchend', () => { this.keys.left = false; });

      this.btnRight.addEventListener('mousedown', () => { sfx.init(); this.keys.right = true; });
      this.btnRight.addEventListener('mouseup', () => { this.keys.right = false; });
      this.btnRight.addEventListener('touchstart', (e) => { sfx.init(); this.keys.right = true; e.preventDefault(); });
      this.btnRight.addEventListener('touchend', () => { this.keys.right = false; });

      this.btnSound.addEventListener('click', () => {
        this.toggleSound();
      });

      this.btnPause.addEventListener('click', () => {
        this.togglePause();
      });

      // Botón de reintento tras derrota
      this.btnRetry.addEventListener('click', () => {
        sfx.init();
        this.resetGame();
      });

      // Cerrar Easter Egg
      this.btnCloseEasterEgg.addEventListener('click', () => {
        this.easterEggOverlay.classList.add('hidden');
      });
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      this.btnPause.textContent = this.isPaused ? '▶ SEGUIR' : '⏸ PAUSA';
      if (this.isPaused) {
        this.showBanner('JUEGO PAUSADO');
      }
    }

    toggleSound() {
      const isEnabled = sfx.toggle();
      this.btnSound.textContent = isEnabled ? '🔊 SFX' : '🔇 MUTE';
    }
  }

  // Arrancar el juego al cargar el DOM
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new BakeOrDieGame();
  });

})();
