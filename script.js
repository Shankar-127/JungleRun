/**
 * ============================================================================
 * JUNGLE RUN: RUN BEYOND THE RUINS
 * Complete 3D Endless Runner Game Engine
 * Pure Vanilla JavaScript & HTML5 Canvas
 * ============================================================================
 */

(function () {
  'use strict';

  // --- Global Constants & Configurations ---
  const LANES = [-140, 0, 140]; // Left, Center, Right in world units
  const LANE_LEFT = 0;
  const LANE_CENTER = 1;
  const LANE_RIGHT = 2;

  const BASE_SPEED = 720;
  const MAX_SPEED = 1850;
  const ACCELERATION = 8.5; // Speed increase per second
  const GRAVITY = 1500;
  const JUMP_VELOCITY = 620;

  const SEGMENT_LENGTH = 120;
  const DRAW_DISTANCE = 34; // Segments ahead
  const FOCAL_LENGTH = 380;
  const CAMERA_HEIGHT = 210;
  const CAMERA_DISTANCE = 270;

  // Biomes definitions
  const BIOMES = [
    {
      id: 'jungle',
      name: 'JUNGLE PATH',
      skyTop: '#062016',
      skyBottom: '#103d2e',
      fogColor: '#0a2c20',
      groundColor: '#081c15',
      roadColor1: '#1b4332',
      roadColor2: '#2d6a4f',
      curbColor: '#52b788',
      sideType: 'trees'
    },
    {
      id: 'temple',
      name: 'ANCIENT TEMPLE',
      skyTop: '#1a1005',
      skyBottom: '#3a240c',
      fogColor: '#2b1b09',
      groundColor: '#1a1208',
      roadColor1: '#4a3821',
      roadColor2: '#5f472a',
      curbColor: '#ffd166',
      sideType: 'pillars'
    },
    {
      id: 'bridge',
      name: 'STONE BRIDGE',
      skyTop: '#081b29',
      skyBottom: '#163b56',
      fogColor: '#102a3e',
      groundColor: '#050f17',
      roadColor1: '#334155',
      roadColor2: '#475569',
      curbColor: '#94a3b8',
      sideType: 'chasm'
    },
    {
      id: 'ruins',
      name: 'UNDERGROUND RUINS',
      skyTop: '#080d1a',
      skyBottom: '#151d38',
      fogColor: '#0e1529',
      groundColor: '#080d18',
      roadColor1: '#1e293b',
      roadColor2: '#283548',
      curbColor: '#00f5d4',
      sideType: 'crystals'
    },
    {
      id: 'volcano',
      name: 'VOLCANIC RUINS',
      skyTop: '#240808',
      skyBottom: '#451212',
      fogColor: '#360c0c',
      groundColor: '#1f0707',
      roadColor1: '#2b1e1e',
      roadColor2: '#3d2b2b',
      curbColor: '#ef476f',
      sideType: 'lava'
    },
    {
      id: 'waterfall',
      name: 'WATERFALL SANCTUARY',
      skyTop: '#061c1d',
      skyBottom: '#0e3a3c',
      fogColor: '#0b2e30',
      groundColor: '#061718',
      roadColor1: '#154b4e',
      roadColor2: '#1d6368',
      curbColor: '#38b000',
      sideType: 'waterfall'
    }
  ];

  // Power-up configurations
  const POWERUP_TYPES = {
    SHIELD: { id: 'shield', name: 'Shield', duration: 12, color: '#00f5d4', icon: '🛡️' },
    MAGNET: { id: 'magnet', name: 'Coin Magnet', duration: 10, color: '#ff007f', icon: '🧲' },
    RUSH: { id: 'rush', name: 'Jungle Rush', duration: 7, color: '#ffbe0b', icon: '⚡' },
    MULTIPLIER: { id: 'multiplier', name: '2X Score', duration: 14, color: '#38b000', icon: '✖️2' },
    CHRONO: { id: 'chrono', name: 'Chrono Slow', duration: 8, color: '#9d4edd', icon: '⏳' }
  };

  // --- Web Audio API Procedural Sound Engine ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.sfxEnabled = true;
      this.musicEnabled = true;
      this.isMusicPlaying = false;
      this.musicTimer = null;
      this.coinNotes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]; // C5, D5, E5, G5, A5, C6
      this.coinCombo = 0;
      this.coinComboTimer = 0;
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

    playJump() {
      if (!this.sfxEnabled || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(460, t + 0.18);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.23);
      } catch (e) {}
    }

    playSlide() {
      if (!this.sfxEnabled || !this.ctx) return;
      try {
        // Friction noise burst
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 600;
        filter.Q.value = 2.0;

        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(t);
      } catch (e) {}
    }

    playCoin() {
      if (!this.sfxEnabled || !this.ctx) return;
      try {
        const now = Date.now();
        if (now - this.coinComboTimer < 700) {
          this.coinCombo++;
        } else {
          this.coinCombo = 0;
        }
        this.coinComboTimer = now;

        const noteIndex = this.coinCombo % this.coinNotes.length;
        const freq = this.coinNotes[noteIndex];

        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, t);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, t);

        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.25);
        osc2.stop(t + 0.25);
      } catch (e) {}
    }

    playPowerup() {
      if (!this.sfxEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const freqs = [330, 440, 554.37, 659.25, 880];
        freqs.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const startTime = t + idx * 0.06;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.22);
        });
      } catch (e) {}
    }

    playShieldBreak() {
      if (!this.sfxEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.35);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.36);
      } catch (e) {}
    }

    playCrash() {
      if (!this.sfxEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        // Deep sub boom
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);

        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.56);

        // Crash noise
        const bufferSize = this.ctx.sampleRate * 0.45;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.linearRampToValueAtTime(120, t + 0.4);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(t);
      } catch (e) {}
    }

    playClick() {
      if (!this.sfxEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.05);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.06);
      } catch (e) {}
    }

    playHighScore() {
      if (!this.sfxEnabled || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const startTime = t + idx * 0.12;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.35, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.42);
        });
      } catch (e) {}
    }

    // Atmospheric tribal rhythm synthesizer
    startMusic() {
      if (!this.musicEnabled || this.isMusicPlaying || !this.ctx) return;
      this.isMusicPlaying = true;
      let step = 0;

      const scheduleBeat = () => {
        if (!this.isMusicPlaying || !this.ctx) return;
        const t = this.ctx.currentTime;

        // Bass drum kick on beat 0 and 8
        if (step % 8 === 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(95, t);
          osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
          gain.gain.setValueAtTime(0.22, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.15);
        }

        // Tribal tom drum on beat 4, 10, 14
        if (step % 8 === 4 || step % 16 === 10 || step % 16 === 14) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          const freq = (step % 8 === 4) ? 140 : 180;
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
          gain.gain.setValueAtTime(0.16, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.11);
        }

        // Shaker / foliage rustle on every step
        if (step % 2 === 0) {
          const bufferSize = this.ctx.sampleRate * 0.03;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 4500;
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.04, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          noise.start(t);
        }

        step = (step + 1) % 16;
        this.musicTimer = setTimeout(scheduleBeat, 135); // ~110 BPM groove
      };

      scheduleBeat();
    }

    stopMusic() {
      this.isMusicPlaying = false;
      if (this.musicTimer) {
        clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }
    }
  }

  // --- Particle Engine ---
  class ParticleEngine {
    constructor() {
      this.particles = [];
      this.maxParticles = 240;
    }

    spawn(x, y, z, options = {}) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      this.particles.push({
        x: x || 0,
        y: y || 0,
        z: z || 0,
        vx: options.vx || (Math.random() - 0.5) * 80,
        vy: options.vy || Math.random() * 90 + 30,
        vz: options.vz || (Math.random() - 0.5) * 60,
        size: options.size || 4,
        color: options.color || '#ffd166',
        alpha: 1,
        life: options.life || 0.6,
        maxLife: options.life || 0.6,
        gravity: options.gravity !== undefined ? options.gravity : 200,
        isScreenSpace: options.isScreenSpace || false
      });
    }

    spawnConfetti(canvasWidth, canvasHeight) {
      const colors = ['#ffd166', '#ff007f', '#00f5d4', '#ffbe0b', '#38b000', '#ffffff'];
      for (let i = 0; i < 90; i++) {
        this.particles.push({
          x: canvasWidth * Math.random(),
          y: -20 - Math.random() * 50,
          z: 0,
          vx: (Math.random() - 0.5) * 160,
          vy: Math.random() * 220 + 120,
          vz: 0,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          life: 2.5,
          maxLife: 2.5,
          gravity: 80,
          isScreenSpace: true
        });
      }
    }

    update(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= p.gravity * dt;
        p.alpha = Math.max(0, p.life / p.maxLife);
      }
    }

    render(ctx, camera, projectFn) {
      ctx.save();
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.isScreenSpace) {
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          if (p.z <= camera.z) continue;
          const proj = projectFn(p.x, p.y, p.z);
          if (!proj) continue;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, Math.max(1, p.size * proj.scale), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    clear() {
      this.particles.length = 0;
    }
  }

  // --- Main Game Class ---
  class JungleRunGame {
    constructor() {
      // DOM Elements
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');

      // Screens & HUD
      this.hud = document.getElementById('hud');
      this.screenMenu = document.getElementById('screen-menu');
      this.screenPause = document.getElementById('screen-pause');
      this.screenGameOver = document.getElementById('screen-game-over');
      this.modalHowToPlay = document.getElementById('modal-how-to-play');
      this.modalSettings = document.getElementById('modal-settings');
      this.modalLeaderboard = document.getElementById('modal-leaderboard');
      this.tutorialPrompt = document.getElementById('tutorial-floating-hint');

      // HUD Stats
      this.hudCoins = document.getElementById('hud-coin-count');
      this.hudScore = document.getElementById('hud-score-count');
      this.hudDistance = document.getElementById('hud-distance-count');
      this.hudMultiplierBadge = document.getElementById('hud-multiplier-badge');
      this.hudPowerupsTray = document.getElementById('hud-powerups');
      this.biomeBanner = document.getElementById('biome-banner');
      this.biomeNameText = document.getElementById('biome-name');
      this.touchControlsLayer = document.getElementById('touch-controls');

      // Systems
      this.sound = new SoundEngine();
      this.particles = new ParticleEngine();

      // State
      this.state = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'
      this.lastTime = 0;
      this.distance = 0;
      this.score = 0;
      this.coins = 0;
      this.speed = BASE_SPEED;
      this.speedMultiplier = 1;
      this.highScore = 0;
      this.currentBiomeIndex = 0;
      this.nextBiomeDistance = 600;

      // Settings
      this.settings = {
        sfx: true,
        music: true,
        graphics: 'high',
        touchPad: false,
        vibration: true
      };

      // Camera
      this.camera = {
        x: 0,
        y: CAMERA_HEIGHT,
        z: 0,
        shake: 0
      };

      // Player
      this.player = {
        laneIndex: LANE_CENTER,
        x: LANES[LANE_CENTER],
        targetX: LANES[LANE_CENTER],
        y: 0,
        vy: 0,
        z: 0,
        isJumping: false,
        isSliding: false,
        slideTimer: 0,
        runCycle: 0,
        roll: 0,
        width: 50,
        height: 75,
        invulnerableTimer: 0
      };

      // World objects
      this.segments = [];
      this.obstacles = [];
      this.coinsList = [];
      this.powerupPickups = [];
      this.activePowerups = {}; // type -> remainingTime

      // Input State
      this.touchStartX = 0;
      this.touchStartY = 0;
      this.touchStartTime = 0;

      // Load persistent data
      this.loadSettings();
      this.loadHighScore();

      // Setup
      this.initEvents();
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      // Start loop
      requestAnimationFrame((t) => this.gameLoop(t));
    }

    // --- Persistence ---
    loadSettings() {
      try {
        const saved = localStorage.getItem('junglerun_settings');
        if (saved) {
          Object.assign(this.settings, JSON.parse(saved));
        }
      } catch (e) {}

      // Apply to UI switches
      const toggleSfx = document.getElementById('toggle-sfx');
      const toggleMusic = document.getElementById('toggle-music');
      const selectGraphics = document.getElementById('select-graphics');
      const toggleTouch = document.getElementById('toggle-touch-pad');
      const toggleVib = document.getElementById('toggle-vibration');

      if (toggleSfx) toggleSfx.checked = this.settings.sfx;
      if (toggleMusic) toggleMusic.checked = this.settings.music;
      if (selectGraphics) selectGraphics.value = this.settings.graphics;
      if (toggleTouch) toggleTouch.checked = this.settings.touchPad;
      if (toggleVib) toggleVib.checked = this.settings.vibration;

      this.sound.sfxEnabled = this.settings.sfx;
      this.sound.musicEnabled = this.settings.music;

      if (this.settings.touchPad) {
        this.touchControlsLayer.classList.add('force-visible');
      } else {
        this.touchControlsLayer.classList.remove('force-visible');
      }
    }

    saveSettings() {
      try {
        localStorage.setItem('junglerun_settings', JSON.stringify(this.settings));
      } catch (e) {}
    }

    loadHighScore() {
      try {
        this.highScore = parseInt(localStorage.getItem('junglerun_highscore'), 10) || 0;
        const menuHighScore = document.getElementById('menu-high-score-val');
        if (menuHighScore) menuHighScore.textContent = this.highScore.toLocaleString();
      } catch (e) {}
    }

    saveRecord(score, distance, coins) {
      try {
        if (score > this.highScore) {
          this.highScore = score;
          localStorage.setItem('junglerun_highscore', this.highScore.toString());
        }
        let records = [];
        const saved = localStorage.getItem('junglerun_records');
        if (saved) records = JSON.parse(saved);
        records.push({
          score,
          distance: Math.floor(distance),
          coins,
          date: new Date().toLocaleDateString()
        });
        records.sort((a, b) => b.score - a.score);
        records = records.slice(0, 5); // Keep top 5
        localStorage.setItem('junglerun_records', JSON.stringify(records));
      } catch (e) {}
    }

    // --- Responsive Canvas Resizing ---
    resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.canvas.width = Math.floor(width * dpr);
      this.canvas.height = Math.floor(height * dpr);
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.logicalWidth = width;
      this.logicalHeight = height;
      this.horizonY = height * 0.44;
    }

    // --- 3D Perspective Projection ---
    project(worldX, worldY, worldZ) {
      const cam = this.camera;
      const relZ = worldZ - cam.z;
      if (relZ <= 10) return null;

      const scale = FOCAL_LENGTH / relZ;
      const x = this.logicalWidth / 2 + (worldX - cam.x) * scale;
      const y = this.horizonY + (cam.y - worldY) * scale;

      return {
        x: x + (Math.random() - 0.5) * cam.shake,
        y: y + (Math.random() - 0.5) * cam.shake,
        scale: scale,
        relZ: relZ
      };
    }

    // --- Event Listeners & Controls ---
    initEvents() {
      // Keyboard input
      window.addEventListener('keydown', (e) => {
        if (this.state === 'PLAYING') {
          if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            this.moveLane(-1);
            e.preventDefault();
          } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            this.moveLane(1);
            e.preventDefault();
          } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
            this.jump();
            e.preventDefault();
          } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
            this.slide();
            e.preventDefault();
          } else if (e.code === 'KeyP' || e.code === 'Escape') {
            this.pauseGame();
            e.preventDefault();
          }
        } else if (this.state === 'PAUSED') {
          if (e.code === 'KeyP' || e.code === 'Escape') {
            this.resumeGame();
            e.preventDefault();
          }
        } else if (this.state === 'GAME_OVER') {
          if (e.code === 'KeyR' || e.code === 'Space') {
            this.startGame();
            e.preventDefault();
          }
        }
      });

      // Mobile Touch Swipes
      const touchSurface = this.canvas;
      touchSurface.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          this.touchStartX = e.touches[0].clientX;
          this.touchStartY = e.touches[0].clientY;
          this.touchStartTime = Date.now();
        }
      }, { passive: true });

      touchSurface.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 0 || this.state !== 'PLAYING') return;
        const deltaX = e.changedTouches[0].clientX - this.touchStartX;
        const deltaY = e.changedTouches[0].clientY - this.touchStartY;
        const deltaTime = Date.now() - this.touchStartTime;

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Threshold for swipe
        if (deltaTime < 450 && Math.max(absX, absY) > 28) {
          if (absX > absY) {
            // Horizontal swipe
            if (deltaX > 0) this.moveLane(1);
            else this.moveLane(-1);
          } else {
            // Vertical swipe
            if (deltaY > 0) this.slide();
            else this.jump();
          }
        }
      }, { passive: true });

      // On-Screen Touch D-pad / Buttons
      document.getElementById('touch-left')?.addEventListener('click', () => this.moveLane(-1));
      document.getElementById('touch-right')?.addEventListener('click', () => this.moveLane(1));
      document.getElementById('touch-jump')?.addEventListener('click', () => this.jump());
      document.getElementById('touch-slide')?.addEventListener('click', () => this.slide());

      // Start & UI Buttons
      document.getElementById('btn-play')?.addEventListener('click', () => {
        this.sound.init();
        this.sound.playClick();
        this.checkTutorialAndStart();
      });

      document.getElementById('btn-how-to-play')?.addEventListener('click', () => {
        this.sound.init();
        this.sound.playClick();
        this.modalHowToPlay.classList.remove('hidden');
      });

      document.getElementById('btn-close-htp')?.addEventListener('click', () => {
        this.sound.playClick();
        this.modalHowToPlay.classList.add('hidden');
      });

      document.getElementById('btn-start-from-guide')?.addEventListener('click', () => {
        this.sound.playClick();
        this.modalHowToPlay.classList.add('hidden');
        this.startGame();
      });

      document.getElementById('btn-settings')?.addEventListener('click', () => {
        this.sound.init();
        this.sound.playClick();
        this.modalSettings.classList.remove('hidden');
      });

      document.getElementById('btn-close-settings')?.addEventListener('click', () => {
        this.sound.playClick();
        this.modalSettings.classList.add('hidden');
      });

      document.getElementById('btn-save-settings')?.addEventListener('click', () => {
        this.sound.playClick();
        this.applySettingsFromUI();
        this.modalSettings.classList.add('hidden');
      });

      document.getElementById('btn-leaderboard')?.addEventListener('click', () => {
        this.sound.init();
        this.sound.playClick();
        this.showLeaderboard();
      });

      document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => {
        this.sound.playClick();
        this.modalLeaderboard.classList.add('hidden');
      });

      document.getElementById('btn-close-records')?.addEventListener('click', () => {
        this.sound.playClick();
        this.modalLeaderboard.classList.add('hidden');
      });

      document.getElementById('btn-clear-records')?.addEventListener('click', () => {
        this.sound.playClick();
        if (confirm('Clear all expedition records?')) {
          localStorage.removeItem('junglerun_records');
          localStorage.removeItem('junglerun_highscore');
          this.highScore = 0;
          this.loadHighScore();
          this.showLeaderboard();
        }
      });

      // In-Game Pause Button
      document.getElementById('btn-hud-pause')?.addEventListener('click', () => {
        this.pauseGame();
      });

      // Pause Menu actions
      document.getElementById('btn-resume')?.addEventListener('click', () => {
        this.sound.playClick();
        this.resumeGame();
      });

      document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
        this.sound.playClick();
        this.startGame();
      });

      document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
        this.sound.playClick();
        this.modalSettings.classList.remove('hidden');
      });

      document.getElementById('btn-pause-menu')?.addEventListener('click', () => {
        this.sound.playClick();
        this.returnToMenu();
      });

      // Game Over Screen actions
      document.getElementById('btn-play-again')?.addEventListener('click', () => {
        this.sound.playClick();
        this.startGame();
      });

      document.getElementById('btn-go-menu')?.addEventListener('click', () => {
        this.sound.playClick();
        this.returnToMenu();
      });

      document.getElementById('btn-go-leaderboard')?.addEventListener('click', () => {
        this.sound.playClick();
        this.showLeaderboard();
      });

      // Floating tutorial dismissal
      document.getElementById('btn-dismiss-tutorial')?.addEventListener('click', () => {
        this.tutorialPrompt.classList.add('hidden');
      });
    }

    applySettingsFromUI() {
      const toggleSfx = document.getElementById('toggle-sfx');
      const toggleMusic = document.getElementById('toggle-music');
      const selectGraphics = document.getElementById('select-graphics');
      const toggleTouch = document.getElementById('toggle-touch-pad');
      const toggleVib = document.getElementById('toggle-vibration');

      this.settings.sfx = toggleSfx ? toggleSfx.checked : true;
      this.settings.music = toggleMusic ? toggleMusic.checked : true;
      this.settings.graphics = selectGraphics ? selectGraphics.value : 'high';
      this.settings.touchPad = toggleTouch ? toggleTouch.checked : false;
      this.settings.vibration = toggleVib ? toggleVib.checked : true;

      this.sound.sfxEnabled = this.settings.sfx;
      this.sound.musicEnabled = this.settings.music;

      if (!this.settings.music) {
        this.sound.stopMusic();
      } else if (this.state === 'PLAYING' && !this.sound.isMusicPlaying) {
        this.sound.startMusic();
      }

      if (this.settings.touchPad) {
        this.touchControlsLayer.classList.add('force-visible');
      } else {
        this.touchControlsLayer.classList.remove('force-visible');
      }

      this.saveSettings();
    }

    checkTutorialAndStart() {
      const seen = localStorage.getItem('junglerun_tutorial_seen');
      if (!seen) {
        localStorage.setItem('junglerun_tutorial_seen', 'true');
        this.modalHowToPlay.classList.remove('hidden');
      } else {
        this.startGame();
      }
    }

    showLeaderboard() {
      const tbody = document.getElementById('leaderboard-body');
      const emptyMsg = document.getElementById('leaderboard-empty');
      tbody.innerHTML = '';

      let records = [];
      try {
        const saved = localStorage.getItem('junglerun_records');
        if (saved) records = JSON.parse(saved);
      } catch (e) {}

      if (records.length === 0) {
        emptyMsg.classList.remove('hidden');
      } else {
        emptyMsg.classList.add('hidden');
        records.forEach((rec, idx) => {
          const row = document.createElement('tr');
          if (idx === 0) row.classList.add('top-1');
          row.innerHTML = `
            <td>#${idx + 1}</td>
            <td><strong>${rec.score.toLocaleString()}</strong></td>
            <td>${rec.distance} m</td>
            <td>🪙 ${rec.coins}</td>
            <td>${rec.date}</td>
          `;
          tbody.appendChild(row);
        });
      }
      this.modalLeaderboard.classList.remove('hidden');
    }

    triggerHaptic(duration = 40) {
      if (this.settings.vibration && navigator.vibrate) {
        try {
          navigator.vibrate(duration);
        } catch (e) {}
      }
    }

    // --- State Transitions ---
    startGame() {
      this.state = 'PLAYING';
      this.distance = 0;
      this.score = 0;
      this.coins = 0;
      this.speed = BASE_SPEED;
      this.speedMultiplier = 1;
      this.currentBiomeIndex = 0;
      this.nextBiomeDistance = 600;

      // Reset Player
      this.player.laneIndex = LANE_CENTER;
      this.player.x = LANES[LANE_CENTER];
      this.player.targetX = LANES[LANE_CENTER];
      this.player.y = 0;
      this.player.vy = 0;
      this.player.z = 0;
      this.player.isJumping = false;
      this.player.isSliding = false;
      this.player.slideTimer = 0;
      this.player.runCycle = 0;
      this.player.invulnerableTimer = 0;

      // Clear world lists
      this.obstacles.length = 0;
      this.coinsList.length = 0;
      this.powerupPickups.length = 0;
      this.activePowerups = {};
      this.particles.clear();

      // Seed Track
      this.initTrack();

      // UI updates
      this.screenMenu.classList.add('hidden');
      this.screenPause.classList.add('hidden');
      this.screenGameOver.classList.add('hidden');
      this.hud.classList.remove('hidden');
      this.updateHUD();

      // Start music
      this.sound.init();
      if (this.settings.music) this.sound.startMusic();

      // Show Biome Banner
      this.showBiomeNotification(BIOMES[0].name);
    }

    pauseGame() {
      if (this.state !== 'PLAYING') return;
      this.state = 'PAUSED';
      this.sound.stopMusic();

      const pauseScore = document.getElementById('pause-score-val');
      const pauseCoins = document.getElementById('pause-coins-val');
      if (pauseScore) pauseScore.textContent = Math.floor(this.score).toLocaleString();
      if (pauseCoins) pauseCoins.textContent = this.coins.toLocaleString();

      this.screenPause.classList.remove('hidden');
    }

    resumeGame() {
      if (this.state !== 'PAUSED') return;
      this.state = 'PLAYING';
      this.screenPause.classList.add('hidden');
      if (this.settings.music) this.sound.startMusic();
    }

    returnToMenu() {
      this.state = 'MENU';
      this.sound.stopMusic();
      this.hud.classList.add('hidden');
      this.screenPause.classList.add('hidden');
      this.screenGameOver.classList.add('hidden');
      this.screenMenu.classList.remove('hidden');
      this.loadHighScore();
    }

    gameOver(reason = 'Lost to the ancient perils of the temple') {
      this.state = 'GAME_OVER';
      this.sound.stopMusic();
      this.sound.playCrash();
      this.triggerHaptic(200);

      this.camera.shake = 28;

      // Check High Score
      const finalScore = Math.floor(this.score);
      const isNewBest = finalScore > this.highScore && finalScore > 0;
      this.saveRecord(finalScore, this.distance, this.coins);

      // Populate Game Over screen
      const reasonEl = document.getElementById('game-over-cause');
      const scoreEl = document.getElementById('go-final-score');
      const distEl = document.getElementById('go-distance');
      const coinsEl = document.getElementById('go-coins');
      const bestEl = document.getElementById('go-high-score');
      const bannerEl = document.getElementById('high-score-banner');

      if (reasonEl) reasonEl.textContent = reason;
      if (scoreEl) scoreEl.textContent = finalScore.toLocaleString();
      if (distEl) distEl.textContent = `${Math.floor(this.distance)} m`;
      if (coinsEl) coinsEl.textContent = this.coins.toLocaleString();
      if (bestEl) bestEl.textContent = this.highScore.toLocaleString();

      if (isNewBest) {
        if (bannerEl) bannerEl.classList.remove('hidden');
        this.sound.playHighScore();
        this.particles.spawnConfetti(this.logicalWidth, this.logicalHeight);
      } else {
        if (bannerEl) bannerEl.classList.add('hidden');
      }

      this.hud.classList.add('hidden');
      this.screenGameOver.classList.remove('hidden');
    }

    showBiomeNotification(name) {
      if (!this.biomeBanner || !this.biomeNameText) return;
      this.biomeNameText.textContent = name;
      this.biomeBanner.classList.remove('hidden');
      this.biomeBanner.style.animation = 'none';
      void this.biomeBanner.offsetWidth; // trigger reflow
      this.biomeBanner.style.animation = 'banner-fade 3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    }

    // --- Player Actions ---
    moveLane(direction) {
      const newLane = this.player.laneIndex + direction;
      if (newLane >= 0 && newLane <= 2) {
        this.player.laneIndex = newLane;
        this.player.targetX = LANES[newLane];
        this.sound.playJump();
        this.triggerHaptic(25);

        // Spawn lane dust
        for (let i = 0; i < 6; i++) {
          this.particles.spawn(this.player.x, 5, this.player.z + 10, {
            vx: -direction * (Math.random() * 50 + 20),
            vy: Math.random() * 40 + 10,
            color: '#8b9b90',
            size: 3
          });
        }
      }
    }

    jump() {
      if (!this.player.isJumping) {
        this.player.isJumping = true;
        this.player.vy = JUMP_VELOCITY;
        this.player.isSliding = false;
        this.sound.playJump();
        this.triggerHaptic(30);

        // Jump dust puff
        for (let i = 0; i < 8; i++) {
          this.particles.spawn(this.player.x, 2, this.player.z, {
            vx: (Math.random() - 0.5) * 60,
            vy: Math.random() * 30 + 10,
            color: '#cbd5e1',
            size: 4
          });
        }
      }
    }

    slide() {
      if (this.player.isJumping) {
        // Dive down fast if currently in air
        this.player.vy = -750;
      }
      this.player.isSliding = true;
      this.player.slideTimer = 0.75;
      this.sound.playSlide();
      this.triggerHaptic(30);

      // Slide sparks & gravel
      for (let i = 0; i < 10; i++) {
        this.particles.spawn(this.player.x, 2, this.player.z + 5, {
          vx: (Math.random() - 0.5) * 70,
          vy: Math.random() * 50 + 20,
          color: '#ffd166',
          size: 3,
          gravity: 300
        });
      }
    }

    // --- Procedural World & Track ---
    initTrack() {
      this.segments = [];
      for (let i = 0; i < DRAW_DISTANCE + 4; i++) {
        this.segments.push({
          z: i * SEGMENT_LENGTH,
          biomeIndex: 0
        });
      }
    }

    updateTrack(dt) {
      // Advance player
      const effectiveSpeed = this.activePowerups.rush
        ? this.speed * 1.85
        : (this.activePowerups.chrono ? this.speed * 0.55 : this.speed);

      const forwardDelta = effectiveSpeed * dt;
      this.player.z += forwardDelta;
      this.distance += forwardDelta * 0.1;

      // Gradually increase speed
      if (this.speed < MAX_SPEED) {
        this.speed += ACCELERATION * dt;
      }

      // Check Biome Shift
      if (this.distance >= this.nextBiomeDistance) {
        this.currentBiomeIndex = (this.currentBiomeIndex + 1) % BIOMES.length;
        this.nextBiomeDistance += 700 + Math.random() * 300;
        this.showBiomeNotification(BIOMES[this.currentBiomeIndex].name);
      }

      // Move segments forward relative to player
      while (this.segments[0].z < this.player.z - SEGMENT_LENGTH) {
        const first = this.segments.shift();
        const lastZ = this.segments[this.segments.length - 1].z;
        first.z = lastZ + SEGMENT_LENGTH;
        first.biomeIndex = this.currentBiomeIndex;
        this.segments.push(first);

        // Spawn items on new segment
        this.spawnSegmentContent(first.z);
      }

      // Clean old objects
      const despawnZ = this.player.z - 150;
      this.obstacles = this.obstacles.filter(o => o.z >= despawnZ);
      this.coinsList = this.coinsList.filter(c => c.z >= despawnZ && !c.collected);
      this.powerupPickups = this.powerupPickups.filter(p => p.z >= despawnZ && !p.collected);
    }

    spawnSegmentContent(z) {
      // Don't spawn hazards during initial runway
      if (z < 1200) return;

      // Spacing check: ensure at least 280 units since last obstacle
      const lastObstacle = this.obstacles[this.obstacles.length - 1];
      if (lastObstacle && (z - lastObstacle.z) < 320) {
        return;
      }

      const rand = Math.random();

      // 42% chance to spawn an obstacle
      if (rand < 0.42) {
        this.spawnRandomObstacle(z);
      } else if (rand < 0.76) {
        // 34% chance to spawn a coin line or arc
        this.spawnCoinFormation(z);
      } else if (rand < 0.84) {
        // 8% chance to spawn a power-up
        this.spawnPowerup(z);
      }
    }

    spawnRandomObstacle(z) {
      const lane = Math.floor(Math.random() * 3);
      const biome = BIOMES[this.currentBiomeIndex];
      const types = ['LOG', 'PORTCULLIS', 'TOTEM', 'FIRE_PIT', 'BOULDER', 'PENDULUM'];

      // Pick obstacle type appropriate for biome & variety
      const type = types[Math.floor(Math.random() * types.length)];

      const obstacle = {
        type: type,
        lane: lane,
        x: LANES[lane],
        z: z,
        width: 70,
        height: 60,
        depth: 30,
        hit: false,
        angle: 0
      };

      if (type === 'LOG' || type === 'FIRE_PIT') {
        obstacle.actionRequired = 'jump';
        obstacle.height = 35;
      } else if (type === 'PORTCULLIS') {
        obstacle.actionRequired = 'slide';
        obstacle.height = 110;
        obstacle.clearanceY = 32; // Underneath space
      } else if (type === 'TOTEM' || type === 'BOULDER') {
        obstacle.actionRequired = 'dodge';
        obstacle.height = 95;
      } else if (type === 'PENDULUM') {
        obstacle.actionRequired = 'dodge';
        obstacle.height = 100;
        obstacle.oscillation = 0;
      }

      this.obstacles.push(obstacle);

      // Occasionally place coins right above a jump obstacle to encourage leaping
      if (obstacle.actionRequired === 'jump' && Math.random() < 0.6) {
        for (let i = 0; i < 3; i++) {
          this.coinsList.push({
            x: obstacle.x,
            y: 70 + Math.sin(i / 2 * Math.PI) * 20,
            z: z - 40 + i * 40,
            angle: 0,
            collected: false
          });
        }
      }
    }

    spawnCoinFormation(z) {
      const lane = Math.floor(Math.random() * 3);
      const count = Math.floor(Math.random() * 4) + 3;
      for (let i = 0; i < count; i++) {
        this.coinsList.push({
          x: LANES[lane],
          y: 20,
          z: z + i * 45,
          angle: Math.random() * Math.PI,
          collected: false
        });
      }
    }

    spawnPowerup(z) {
      const lane = Math.floor(Math.random() * 3);
      const keys = Object.keys(POWERUP_TYPES);
      const typeKey = keys[Math.floor(Math.random() * keys.length)];
      const type = POWERUP_TYPES[typeKey];

      this.powerupPickups.push({
        type: type,
        x: LANES[lane],
        y: 35,
        z: z,
        bobPhase: Math.random() * Math.PI * 2,
        collected: false
      });
    }

    // --- Physics, Collision & Power-ups ---
    updatePlayer(dt) {
      const p = this.player;

      // Smooth horizontal lane transition
      p.x += (p.targetX - p.x) * 14 * dt;
      p.roll = (p.targetX - p.x) * -0.0035;

      // Jumping / Gravity
      if (p.isJumping) {
        p.vy -= GRAVITY * dt;
        p.y += p.vy * dt;
        if (p.y <= 0) {
          p.y = 0;
          p.vy = 0;
          p.isJumping = false;
          // Landing dust
          for (let i = 0; i < 6; i++) {
            this.particles.spawn(p.x, 2, p.z, {
              vx: (Math.random() - 0.5) * 50,
              vy: Math.random() * 25 + 10,
              color: '#cbd5e1',
              size: 3
            });
          }
        }
      }

      // Sliding
      if (p.isSliding) {
        p.slideTimer -= dt;
        if (p.slideTimer <= 0) {
          p.isSliding = false;
        } else {
          // Slide continuous dust
          if (Math.random() < 0.6) {
            this.particles.spawn(p.x, 2, p.z + 5, {
              vx: (Math.random() - 0.5) * 40,
              vy: Math.random() * 20 + 10,
              color: '#ffd166',
              size: 2
            });
          }
        }
      }

      // Run cycle phase
      p.runCycle += this.speed * dt * 0.04;

      // Invulnerability flicker countdown
      if (p.invulnerableTimer > 0) {
        p.invulnerableTimer -= dt;
      }

      // Camera follow with slight lag
      this.camera.z = p.z - CAMERA_DISTANCE;
      this.camera.x += (p.x * 0.35 - this.camera.x) * 10 * dt;

      // Camera shake decay
      if (this.camera.shake > 0) {
        this.camera.shake = Math.max(0, this.camera.shake - 55 * dt);
      }
    }

    updatePowerups(dt) {
      const p = this.player;

      // Update active powerups
      for (const key in this.activePowerups) {
        this.activePowerups[key] -= dt;
        if (this.activePowerups[key] <= 0) {
          delete this.activePowerups[key];
        }
      }

      // Coin Magnet effect
      if (this.activePowerups.magnet) {
        const pullRadius = 380;
        this.coinsList.forEach(coin => {
          if (!coin.collected && Math.abs(coin.z - p.z) < pullRadius) {
            coin.x += (p.x - coin.x) * 12 * dt;
            coin.y += (p.y + 25 - coin.y) * 12 * dt;
            coin.z += (p.z - coin.z) * 6 * dt;
          }
        });
      }

      // Jungle Rush invulnerability & speed particles
      if (this.activePowerups.rush) {
        this.particles.spawn(p.x + (Math.random() - 0.5) * 40, p.y + Math.random() * 50, p.z - 20, {
          vx: (Math.random() - 0.5) * 40,
          vy: Math.random() * 30,
          vz: -200,
          color: '#ffbe0b',
          size: 4,
          life: 0.3
        });
      }

      this.updatePowerupHUD();
    }

    checkCollisions() {
      const p = this.player;
      const playerHitZ = p.z;
      const playerRadiusX = 26;

      // Coins Collection
      for (let i = 0; i < this.coinsList.length; i++) {
        const coin = this.coinsList[i];
        if (coin.collected) continue;

        const dz = Math.abs(coin.z - playerHitZ);
        const dx = Math.abs(coin.x - p.x);
        const dy = Math.abs(coin.y - (p.y + 25));

        if (dz < 35 && dx < 35 && dy < 45) {
          coin.collected = true;
          this.coins++;
          const scoreGain = (this.activePowerups.multiplier ? 200 : 100);
          this.score += scoreGain;
          this.sound.playCoin();
          this.triggerHaptic(15);

          // Coin sparkle burst
          for (let k = 0; k < 7; k++) {
            this.particles.spawn(coin.x, coin.y, coin.z, {
              vx: (Math.random() - 0.5) * 110,
              vy: Math.random() * 90 + 20,
              vz: (Math.random() - 0.5) * 80,
              color: '#ffd166',
              size: 4,
              life: 0.45
            });
          }
        }
      }

      // Power-up Pickups
      for (let i = 0; i < this.powerupPickups.length; i++) {
        const pu = this.powerupPickups[i];
        if (pu.collected) continue;

        const dz = Math.abs(pu.z - playerHitZ);
        const dx = Math.abs(pu.x - p.x);

        if (dz < 40 && dx < 40) {
          pu.collected = true;
          this.activePowerups[pu.type.id] = pu.type.duration;
          this.sound.playPowerup();
          this.triggerHaptic(60);

          // Pickup blast
          for (let k = 0; k < 18; k++) {
            this.particles.spawn(pu.x, pu.y, pu.z, {
              vx: (Math.random() - 0.5) * 150,
              vy: Math.random() * 120 + 30,
              vz: (Math.random() - 0.5) * 120,
              color: pu.type.color,
              size: 5,
              life: 0.7
            });
          }
        }
      }

      // Obstacle Collisions
      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        if (obs.hit) continue;

        // Pendulum dynamic movement
        if (obs.type === 'PENDULUM') {
          obs.oscillation += 3.2 * 0.016;
          obs.x = Math.sin(obs.oscillation) * 130;
        }

        const dz = Math.abs(obs.z - playerHitZ);
        const dx = Math.abs(obs.x - p.x);

        if (dz < (obs.depth + 20) && dx < (obs.width / 2 + playerRadiusX - 8)) {
          // If Jungle Rush is active, blast right through obstacle!
          if (this.activePowerups.rush) {
            obs.hit = true;
            this.camera.shake = 12;
            for (let k = 0; k < 16; k++) {
              this.particles.spawn(obs.x, 30, obs.z, {
                vx: (Math.random() - 0.5) * 160,
                vy: Math.random() * 140,
                color: '#ffbe0b',
                size: 6
              });
            }
            continue;
          }

          // Evaluate hazard evasion
          let avoided = false;

          if (obs.actionRequired === 'jump') {
            if (p.isJumping && p.y >= (obs.height - 8)) {
              avoided = true;
            }
          } else if (obs.actionRequired === 'slide') {
            if (p.isSliding && p.y <= obs.clearanceY) {
              avoided = true;
            }
          }

          if (!avoided && p.invulnerableTimer <= 0) {
            // Check Shield
            if (this.activePowerups.shield) {
              delete this.activePowerups.shield;
              obs.hit = true;
              p.invulnerableTimer = 1.4;
              this.camera.shake = 16;
              this.sound.playShieldBreak();
              this.triggerHaptic(120);

              // Shield shatter particles
              for (let k = 0; k < 20; k++) {
                this.particles.spawn(p.x, 40, p.z, {
                  vx: (Math.random() - 0.5) * 180,
                  vy: Math.random() * 140,
                  vz: (Math.random() - 0.5) * 120,
                  color: '#00f5d4',
                  size: 5,
                  life: 0.8
                });
              }
            } else {
              // Fatal collision!
              obs.hit = true;
              let reason = 'Collided with an obstacle';
              if (obs.actionRequired === 'jump') reason = 'Tripped over ancient hazards';
              else if (obs.actionRequired === 'slide') reason = 'Crashed into an overhead barrier';
              else if (obs.type === 'PENDULUM') reason = 'Struck by a swinging temple pendulum';
              else if (obs.type === 'TOTEM') reason = 'Smashed into a sacred idol';
              this.gameOver(reason);
              return;
            }
          }
        }
      }

      // Add distance score
      const multi = this.activePowerups.multiplier ? 2 : 1;
      this.score += (this.speed * 0.016 * 0.1) * multi;
    }

    updateHUD() {
      if (this.hudCoins) this.hudCoins.textContent = this.coins.toLocaleString();
      if (this.hudScore) this.hudScore.textContent = Math.floor(this.score).toString().padStart(6, '0');
      if (this.hudDistance) this.hudDistance.textContent = `${Math.floor(this.distance)} m`;

      if (this.hudMultiplierBadge) {
        if (this.activePowerups.multiplier) {
          this.hudMultiplierBadge.classList.remove('hidden');
        } else {
          this.hudMultiplierBadge.classList.add('hidden');
        }
      }
    }

    updatePowerupHUD() {
      if (!this.hudPowerupsTray) return;
      this.hudPowerupsTray.innerHTML = '';

      for (const id in this.activePowerups) {
        const remaining = this.activePowerups[id];
        const type = Object.values(POWERUP_TYPES).find(t => t.id === id);
        if (!type) continue;

        const pill = document.createElement('div');
        pill.className = `powerup-pill ${id}`;
        pill.innerHTML = `
          <span class="powerup-pill-icon">${type.icon}</span>
          <div class="powerup-bar-track">
            <div class="powerup-bar-fill" style="background-color: ${type.color}; width: ${(remaining / type.duration) * 100}%"></div>
          </div>
        `;
        this.hudPowerupsTray.appendChild(pill);
      }
    }

    // --- Rendering Pipeline ---
    render() {
      const ctx = this.ctx;
      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const biome = BIOMES[this.currentBiomeIndex];

      ctx.clearRect(0, 0, w, h);

      // 1. Sky & Horizon Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, this.horizonY);
      skyGrad.addColorStop(0, biome.skyTop);
      skyGrad.addColorStop(1, biome.skyBottom);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, this.horizonY);

      // Atmospheric distant mountain/temple silhouettes
      this.renderHorizonSilhouettes(ctx, biome);

      // 2. Ground Backdrop below horizon
      const groundGrad = ctx.createLinearGradient(0, this.horizonY, 0, h);
      groundGrad.addColorStop(0, biome.fogColor);
      groundGrad.addColorStop(0.3, biome.groundColor);
      groundGrad.addColorStop(1, '#020504');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, this.horizonY, w, h - this.horizonY);

      // 3. Render 3D Track Segments
      this.renderTrack(ctx);

      // 4. Depth-Sort World Entities (Obstacles, Coins, Powerups, Player)
      const renderList = [];

      // Add Obstacles
      for (let i = 0; i < this.obstacles.length; i++) {
        const obs = this.obstacles[i];
        if (obs.z > this.camera.z) {
          renderList.push({ type: 'obstacle', z: obs.z, obj: obs });
        }
      }

      // Add Coins
      for (let i = 0; i < this.coinsList.length; i++) {
        const coin = this.coinsList[i];
        if (!coin.collected && coin.z > this.camera.z) {
          renderList.push({ type: 'coin', z: coin.z, obj: coin });
        }
      }

      // Add Power-up items
      for (let i = 0; i < this.powerupPickups.length; i++) {
        const pu = this.powerupPickups[i];
        if (!pu.collected && pu.z > this.camera.z) {
          renderList.push({ type: 'powerup', z: pu.z, obj: pu });
        }
      }

      // Add Player
      renderList.push({ type: 'player', z: this.player.z, obj: this.player });

      // Sort entities Back to Front (highest Z first)
      renderList.sort((a, b) => b.z - a.z);

      // Render all entities in order
      for (let i = 0; i < renderList.length; i++) {
        const item = renderList[i];
        if (item.type === 'obstacle') this.renderObstacle(ctx, item.obj);
        else if (item.type === 'coin') this.renderCoin(ctx, item.obj);
        else if (item.type === 'powerup') this.renderPowerupItem(ctx, item.obj);
        else if (item.type === 'player') this.renderPlayer(ctx, item.obj);
      }

      // 5. Render Particle System
      this.particles.render(ctx, this.camera, (x, y, z) => this.project(x, y, z));

      // 6. Ambient Mist / Vignette Overlay
      this.renderVignette(ctx);
    }

    renderHorizonSilhouettes(ctx, biome) {
      const hY = this.horizonY;
      const w = this.logicalWidth;

      ctx.save();
      ctx.fillStyle = biome.fogColor;
      ctx.globalAlpha = 0.55;

      // Distant temple pyramid & tree contours
      ctx.beginPath();
      ctx.moveTo(0, hY);
      ctx.lineTo(w * 0.15, hY - 45);
      ctx.lineTo(w * 0.25, hY - 80);
      ctx.lineTo(w * 0.35, hY - 30);
      ctx.lineTo(w * 0.48, hY - 65);
      ctx.lineTo(w * 0.52, hY - 110); // Center apex
      ctx.lineTo(w * 0.56, hY - 65);
      ctx.lineTo(w * 0.68, hY - 35);
      ctx.lineTo(w * 0.8, hY - 95);
      ctx.lineTo(w * 0.9, hY - 40);
      ctx.lineTo(w, hY);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    renderTrack(ctx) {
      const roadHalfWidth = 240;
      const curbWidth = 28;

      // Draw road quads from furthest to closest segment
      for (let i = this.segments.length - 1; i > 0; i--) {
        const segNear = this.segments[i - 1];
        const segFar = this.segments[i];

        if (segNear.z <= this.camera.z) continue;

        const pNear = this.project(0, 0, segNear.z);
        const pFar = this.project(0, 0, segFar.z);

        if (!pNear || !pFar) continue;

        const wNear = roadHalfWidth * pNear.scale;
        const wFar = roadHalfWidth * pFar.scale;
        const cNear = curbWidth * pNear.scale;
        const cFar = curbWidth * pFar.scale;

        const biome = BIOMES[segNear.biomeIndex || 0];
        const isAlt = (Math.floor(segNear.z / SEGMENT_LENGTH) % 2 === 0);

        // Ground depth fog factor
        const fogAlpha = Math.min(1, Math.max(0, (segNear.z - this.player.z) / (DRAW_DISTANCE * SEGMENT_LENGTH)));

        // Road Surface Quad
        ctx.fillStyle = isAlt ? biome.roadColor1 : biome.roadColor2;
        ctx.beginPath();
        ctx.moveTo(pNear.x - wNear, pNear.y);
        ctx.lineTo(pNear.x + wNear, pNear.y);
        ctx.lineTo(pFar.x + wFar, pFar.y);
        ctx.lineTo(pFar.x - wFar, pFar.y);
        ctx.closePath();
        ctx.fill();

        // Left Curb
        ctx.fillStyle = biome.curbColor;
        ctx.beginPath();
        ctx.moveTo(pNear.x - wNear - cNear, pNear.y);
        ctx.lineTo(pNear.x - wNear, pNear.y);
        ctx.lineTo(pFar.x - wFar, pFar.y);
        ctx.lineTo(pFar.x - wFar - cFar, pFar.y);
        ctx.closePath();
        ctx.fill();

        // Right Curb
        ctx.beginPath();
        ctx.moveTo(pNear.x + wNear, pNear.y);
        ctx.lineTo(pNear.x + wNear + cNear, pNear.y);
        ctx.lineTo(pFar.x + wFar + cFar, pFar.y);
        ctx.lineTo(pFar.x + wFar, pFar.y);
        ctx.closePath();
        ctx.fill();

        // Lane Separator Dashes
        const laneW = 140;
        [-laneW / 2, laneW / 2].forEach(lx => {
          const dashNear = this.project(lx, 0, segNear.z);
          const dashFar = this.project(lx, 0, segFar.z);
          if (dashNear && dashFar && isAlt) {
            ctx.strokeStyle = 'rgba(255, 215, 102, 0.22)';
            ctx.lineWidth = Math.max(1, 3 * dashNear.scale);
            ctx.beginPath();
            ctx.moveTo(dashNear.x, dashNear.y);
            ctx.lineTo(dashFar.x, dashFar.y);
            ctx.stroke();
          }
        });

        // Track Side Scenery (Pillars, Braziers, Totems)
        if (Math.floor(segNear.z / SEGMENT_LENGTH) % 3 === 0) {
          this.renderTrackSideDecorations(ctx, segNear.z, roadHalfWidth + curbWidth + 30, biome);
        }

        // Apply depth distance fog
        if (fogAlpha > 0.05) {
          ctx.fillStyle = biome.fogColor;
          ctx.globalAlpha = fogAlpha * 0.85;
          ctx.beginPath();
          ctx.moveTo(pNear.x - wNear - cNear, pNear.y);
          ctx.lineTo(pNear.x + wNear + cNear, pNear.y);
          ctx.lineTo(pFar.x + wFar + cFar, pFar.y);
          ctx.lineTo(pFar.x - wFar - cFar, pFar.y);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    renderTrackSideDecorations(ctx, z, sideOffset, biome) {
      [-sideOffset, sideOffset].forEach(offsetX => {
        const base = this.project(offsetX, 0, z);
        const top = this.project(offsetX, 130, z);
        if (!base || !top) return;

        const w = 24 * base.scale;
        const h = base.y - top.y;

        // Pillar body
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(base.x - w / 2, top.y, w, h);

        // Carved rune trim
        ctx.fillStyle = biome.curbColor;
        ctx.fillRect(base.x - w / 2, top.y + h * 0.3, w, 4 * base.scale);

        // Flaming brazier at top
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(base.x, top.y, Math.max(2, 8 * base.scale), 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // --- Entity Renderers ---
    renderObstacle(ctx, obs) {
      const p = this.project(obs.x, 0, obs.z);
      if (!p) return;

      const w = obs.width * p.scale;
      const h = obs.height * p.scale;
      const x = p.x;
      const y = p.y;

      ctx.save();

      // Soft ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.6, 8 * p.scale, 0, 0, Math.PI * 2);
      ctx.fill();

      if (obs.type === 'LOG') {
        // Low fallen mossy log
        ctx.fillStyle = '#3e2723';
        ctx.strokeStyle = '#2d6a4f';
        ctx.lineWidth = Math.max(1, 3 * p.scale);
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h, w, h, 6 * p.scale);
        ctx.fill();
        ctx.stroke();

        // Wood grain bark lines
        ctx.fillStyle = '#2e1c14';
        ctx.fillRect(x - w / 2 + 6 * p.scale, y - h + 4 * p.scale, w - 12 * p.scale, 4 * p.scale);
      } else if (obs.type === 'FIRE_PIT') {
        // Blazing fire pit / spikes
        ctx.fillStyle = '#1a0d0d';
        ctx.fillRect(x - w / 2, y - 10 * p.scale, w, 10 * p.scale);

        // Animated flames
        const flicker = Math.sin(Date.now() * 0.01 + obs.z) * 6 * p.scale;
        ctx.fillStyle = '#fb8500';
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y);
        ctx.lineTo(x - w / 4, y - h - flicker);
        ctx.lineTo(x, y - 10 * p.scale);
        ctx.lineTo(x + w / 4, y - h + flicker);
        ctx.lineTo(x + w / 2, y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.moveTo(x - w / 4, y);
        ctx.lineTo(x, y - h * 0.6);
        ctx.lineTo(x + w / 4, y);
        ctx.closePath();
        ctx.fill();
      } else if (obs.type === 'PORTCULLIS') {
        // Overhead temple iron portcullis (Slide underneath)
        const clearance = obs.clearanceY * p.scale;

        // Side stone pillars
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - w / 2 - 8 * p.scale, y - h, 8 * p.scale, h);
        ctx.fillRect(x + w / 2, y - h, 8 * p.scale, h);

        // Hanging gate
        ctx.fillStyle = '#475569';
        ctx.fillRect(x - w / 2, y - h, w, h - clearance);

        // Portcullis spikes
        ctx.fillStyle = '#1e293b';
        const spikes = 5;
        const spikeW = w / spikes;
        for (let i = 0; i < spikes; i++) {
          ctx.beginPath();
          ctx.moveTo(x - w / 2 + i * spikeW, y - clearance);
          ctx.lineTo(x - w / 2 + (i + 0.5) * spikeW, y - clearance + 8 * p.scale);
          ctx.lineTo(x - w / 2 + (i + 1) * spikeW, y - clearance);
          ctx.closePath();
          ctx.fill();
        }

        // Warning runes on arch
        ctx.fillStyle = '#ef476f';
        ctx.fillRect(x - w / 3, y - h + 4 * p.scale, (w * 2) / 3, 4 * p.scale);
      } else if (obs.type === 'TOTEM') {
        // Giant carved stone idol
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - w / 2, y - h, w, h);

        // Golden idol face
        ctx.fillStyle = '#ffb703';
        const eyeSize = 6 * p.scale;
        ctx.fillRect(x - w * 0.25, y - h * 0.7, eyeSize, eyeSize);
        ctx.fillRect(x + w * 0.25 - eyeSize, y - h * 0.7, eyeSize, eyeSize);
        ctx.fillRect(x - w * 0.2, y - h * 0.4, w * 0.4, 6 * p.scale);

        // Cracks
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2 * p.scale;
        ctx.beginPath();
        ctx.moveTo(x, y - h);
        ctx.lineTo(x - 10 * p.scale, y - h * 0.5);
        ctx.stroke();
      } else if (obs.type === 'BOULDER') {
        // Round boulder
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(x, y - h / 2, h / 2, 0, Math.PI * 2);
        ctx.fill();

        // Moss patch
        ctx.fillStyle = '#2d6a4f';
        ctx.beginPath();
        ctx.arc(x - 5 * p.scale, y - h * 0.6, h * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'PENDULUM') {
        // Swinging blade
        const topY = y - 180 * p.scale;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3 * p.scale;
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, y - h * 0.5);
        ctx.stroke();

        // Heavy axe head
        ctx.fillStyle = '#ef476f';
        ctx.beginPath();
        ctx.arc(x, y - h * 0.5, 24 * p.scale, 0, Math.PI);
        ctx.fill();
      }

      ctx.restore();
    }

    renderCoin(ctx, coin) {
      coin.angle += 0.05;
      const p = this.project(coin.x, coin.y, coin.z);
      if (!p) return;

      const size = 18 * p.scale;
      const x = p.x;
      const y = p.y;
      const cosAngle = Math.cos(coin.angle);

      ctx.save();

      // Coin ground shadow
      const pShadow = this.project(coin.x, 0, coin.z);
      if (pShadow) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(pShadow.x, pShadow.y, size * 0.7, 4 * p.scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rotating gold medallion
      ctx.fillStyle = '#ffb703';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = Math.max(1, 2 * p.scale);
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(1, Math.abs(cosAngle) * size), size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner coin symbol
      if (Math.abs(cosAngle) > 0.3) {
        ctx.fillStyle = '#fb8500';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, size * 0.45 * Math.abs(cosAngle)), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    renderPowerupItem(ctx, pu) {
      pu.bobPhase += 0.06;
      const floatingY = pu.y + Math.sin(pu.bobPhase) * 10;
      const p = this.project(pu.x, floatingY, pu.z);
      if (!p) return;

      const size = 26 * p.scale;
      const x = p.x;
      const y = p.y;

      ctx.save();

      // Ground glow ring
      const pShadow = this.project(pu.x, 0, pu.z);
      if (pShadow) {
        ctx.strokeStyle = pu.type.color;
        ctx.lineWidth = 2 * p.scale;
        ctx.beginPath();
        ctx.ellipse(pShadow.x, pShadow.y, size * 0.8, 6 * p.scale, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Rotating 3D Diamond / Shield container
      ctx.fillStyle = pu.type.color;
      ctx.shadowColor = pu.type.color;
      ctx.shadowBlur = 14 * p.scale;

      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.8, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size * 0.8, y);
      ctx.closePath();
      ctx.fill();

      // Power-up Icon glyph
      ctx.font = `${Math.floor(18 * p.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.type.icon, x, y);

      ctx.restore();
    }

    renderPlayer(ctx, p) {
      // Don't render on some frames during invulnerability flicker
      if (p.invulnerableTimer > 0 && Math.floor(Date.now() / 70) % 2 === 0) {
        return;
      }

      const proj = this.project(p.x, p.y, p.z);
      if (!proj) return;

      const scale = proj.scale;
      const px = proj.x;
      const py = proj.y;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.roll);

      // 1. Dynamic Drop Shadow on ground
      const pShadow = this.project(p.x, 0, p.z);
      if (pShadow) {
        const shadowDist = Math.max(0.2, 1 - p.y / 280);
        ctx.save();
        ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(pShadow.x, pShadow.y, 24 * scale * shadowDist, 7 * scale * shadowDist, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Active Aura (Shield bubble, Rush flame)
      if (this.activePowerups.shield) {
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 3 * scale;
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 12 * scale;
        ctx.beginPath();
        ctx.arc(0, -38 * scale, 48 * scale, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (this.activePowerups.rush) {
        ctx.fillStyle = 'rgba(255, 190, 11, 0.35)';
        ctx.beginPath();
        ctx.arc(0, -38 * scale, 45 * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Stylized Procedural Adventurer Character
      const runCycle = p.runCycle;
      const isSliding = p.isSliding;

      if (isSliding) {
        // --- Low Slide Stance ---
        // Torso tilted back
        ctx.fillStyle = '#b08968'; // Explorer shirt
        ctx.fillRect(-12 * scale, -24 * scale, 24 * scale, 14 * scale);

        // Legs sliding forward
        ctx.fillStyle = '#3a5a40'; // Khaki trousers
        ctx.fillRect(-8 * scale, -10 * scale, 26 * scale, 10 * scale);

        // Head tilted
        ctx.fillStyle = '#e0a96d'; // Skin tone
        ctx.beginPath();
        ctx.arc(-8 * scale, -32 * scale, 9 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Hat
        ctx.fillStyle = '#582f0e';
        ctx.fillRect(-18 * scale, -38 * scale, 20 * scale, 4 * scale);
        ctx.fillRect(-14 * scale, -45 * scale, 12 * scale, 8 * scale);
      } else {
        // --- Upright Running Stance with Animated Limbs ---
        const legSwing = Math.sin(runCycle) * 16 * scale;
        const armSwing = Math.cos(runCycle) * 14 * scale;
        const bob = p.isJumping ? 0 : Math.abs(Math.sin(runCycle * 2)) * 5 * scale;

        const torsoY = -48 * scale - bob;

        // Left Leg
        ctx.fillStyle = '#3a5a40';
        ctx.beginPath();
        ctx.moveTo(-7 * scale, torsoY + 24 * scale);
        ctx.lineTo(-7 * scale + legSwing, 0);
        ctx.lineWidth = 6 * scale;
        ctx.strokeStyle = '#3a5a40';
        ctx.stroke();

        // Right Leg
        ctx.beginPath();
        ctx.moveTo(7 * scale, torsoY + 24 * scale);
        ctx.lineTo(7 * scale - legSwing, 0);
        ctx.stroke();

        // Torso / Explorer Vest
        ctx.fillStyle = '#7f5539';
        ctx.fillRect(-11 * scale, torsoY, 22 * scale, 26 * scale);

        // Backpack on back
        ctx.fillStyle = '#43281c';
        ctx.fillRect(-14 * scale, torsoY + 4 * scale, 5 * scale, 18 * scale);

        // Explorer Belt
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(-11 * scale, torsoY + 21 * scale, 22 * scale, 4 * scale);

        // Left Arm
        ctx.strokeStyle = '#e0a96d';
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(-11 * scale, torsoY + 4 * scale);
        ctx.lineTo(-12 * scale - armSwing, torsoY + 18 * scale);
        ctx.stroke();

        // Right Arm
        ctx.beginPath();
        ctx.moveTo(11 * scale, torsoY + 4 * scale);
        ctx.lineTo(12 * scale + armSwing, torsoY + 18 * scale);
        ctx.stroke();

        // Head
        ctx.fillStyle = '#e0a96d';
        ctx.beginPath();
        ctx.arc(0, torsoY - 11 * scale, 9 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Red Bandana / Scarf
        ctx.fillStyle = '#ef476f';
        ctx.fillRect(-8 * scale, torsoY - 3 * scale, 16 * scale, 4 * scale);

        // Explorer Fedora Hat
        ctx.fillStyle = '#582f0e';
        ctx.beginPath();
        ctx.ellipse(0, torsoY - 16 * scale, 18 * scale, 4 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-9 * scale, torsoY - 26 * scale, 18 * scale, 10 * scale);
      }

      ctx.restore();
    }

    renderVignette(ctx) {
      const w = this.logicalWidth;
      const h = this.logicalHeight;

      // Dark jungle vignette around edges
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 0.9);
      vigGrad.addColorStop(0, 'transparent');
      vigGrad.addColorStop(1, 'rgba(5, 19, 14, 0.65)');

      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // --- Main Game Loop ---
    gameLoop(timestamp) {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.08); // Clamp max dt
      this.lastTime = timestamp;

      if (this.state === 'PLAYING') {
        this.updateTrack(dt);
        this.updatePlayer(dt);
        this.updatePowerups(dt);
        this.checkCollisions();
        this.particles.update(dt);
        this.updateHUD();
      } else if (this.state === 'MENU' || this.state === 'GAME_OVER') {
        // Ambient background camera drift in menus
        this.camera.x = Math.sin(timestamp * 0.0006) * 45;
        this.particles.update(dt);
      }

      this.render();
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  // Initialize game on DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new JungleRunGame();
  });
})();
