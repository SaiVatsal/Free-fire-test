/**
 * Free Fire 4K - Main Game Engine & Controller
 */

class GameEngine {
    constructor() {
        this.container = document.getElementById('game-container');
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.hasWon = false;
        this.graphicsPreset = '4k'; // default 4K Ultra

        this.initScene();
        this.initLighting();
        this.initGameEntities();
        this.setupWindowEvents();
    }

    initScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x76a5af); // Tropical sky cyan
        this.scene.fog = new THREE.FogExp2(0x76a5af, 0.0045); // Atmospheric distance haze

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            600
        );

        // WebGL Renderer with High-Fidelity 4K Options
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Apply 4K / High-DPI Settings
        this.applyRendererQuality();

        // High dynamic range tone mapping
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);
    }

    applyRendererQuality() {
        if (this.graphicsPreset === '4k') {
            // Ultra HD Supersampling (True 4K Sharpness)
            const targetRatio = Math.max(window.devicePixelRatio, 2.0);
            this.renderer.setPixelRatio(targetRatio);
        } else if (this.graphicsPreset === '2k') {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        } else {
            // 1080p Standard
            this.renderer.setPixelRatio(1.0);
        }
    }

    setGraphicsPreset(preset) {
        this.graphicsPreset = preset;
        this.applyRendererQuality();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    initLighting() {
        // Sun Light with Crisp Soft Shadows
        this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.8);
        this.sunLight.position.set(120, 160, 90);
        this.sunLight.castShadow = true;

        // High resolution shadow map for 4K clarity
        this.sunLight.shadow.mapSize.width = 4096;
        this.sunLight.shadow.mapSize.height = 4096;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 400;
        this.sunLight.shadow.camera.left = -160;
        this.sunLight.shadow.camera.right = 160;
        this.sunLight.shadow.camera.top = 160;
        this.sunLight.shadow.camera.bottom = -160;
        this.sunLight.shadow.bias = -0.0003;
        this.scene.add(this.sunLight);

        // Ambient Hemisphere Light (Sky cyan + Warm ground reflection)
        const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x3b5323, 0.7);
        this.scene.add(hemiLight);
    }

    initGameEntities() {
        // 1. World & Bermuda Map
        this.world = new WorldBuilder(this.scene);
        this.world.buildMap();

        // 2. Player
        this.player = new Player(this.scene, this.camera, this.renderer.domElement);

        // 3. UI System
        this.ui = new UIManager();
        window.UI = this.ui;

        // 4. Spawn 9 AI Bots across the island
        this.bots = [];
        const botConfigs = window.BOT_NAMES || [];
        const spawnDistances = [35, 55, 70, 85, 100, 115, 130, 140, 150];

        botConfigs.forEach((cfg, idx) => {
            const angle = (idx / botConfigs.length) * Math.PI * 2 + Math.random() * 0.4;
            const dist = spawnDistances[idx] || 60;
            const spawnX = Math.cos(angle) * dist;
            const spawnZ = Math.sin(angle) * dist;

            const bot = new Bot(this.scene, this.camera, cfg, new THREE.Vector3(spawnX, 0, spawnZ));
            this.bots.push(bot);
        });

        // Set global references
        window.gameInstance = this;
    }

    setupWindowEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.applyRendererQuality();
        });

        // Start button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startGame();
            });
        }

        // Restart buttons
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                location.reload();
            });
        }
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                location.reload();
            });
        }
    }

    startGame() {
        const startMenu = document.getElementById('start-menu');
        if (startMenu) {
            startMenu.style.display = 'none';
        }
        this.isRunning = true;
        this.clock.start();

        // Request pointer lock
        this.renderer.domElement.requestPointerLock();
        window.Sound.ensureContext();

        // Begin main game loop
        this.loop();
    }

    triggerVictory() {
        if (this.hasWon) return;
        this.hasWon = true;
        if (this.ui) {
            this.ui.showVictoryScreen();
        }
    }

    checkLootPickup() {
        if (!this.player || this.player.isDead) return;

        // Check Airdrop pickup
        if (this.world.airdrop && !this.world.airdrop.looted) {
            const dist = this.player.position.distanceTo(this.world.airdrop.position);
            if (dist < 3.2) {
                this.world.airdrop.looted = true;
                this.player.armor = this.player.maxArmor; // Level 3 vest full repair
                this.player.medkits += 2;
                // Add sniper ammo
                const awm = this.player.weaponManager.weapons.awm;
                if (awm) awm.currentReserve += 15;
                window.Sound.playMechanicalClick();
                this.ui.addFeedEntry('Player', 'Airdrop Crate', 'Level 3 Loot', false);
            }
        }

        // Check Loot Boxes dropped by bots
        if (this.world.lootBoxes) {
            for (let lb of this.world.lootBoxes) {
                if (lb.collected) continue;
                if (this.player.position.distanceTo(lb.pos) < 2.5) {
                    lb.collected = true;
                    this.scene.remove(lb.mesh);
                    // Grant ammo & medkit
                    const activeWep = this.player.weaponManager.getActiveWeapon();
                    activeWep.currentReserve += 45;
                    this.player.medkits = Math.min(5, this.player.medkits + 1);
                    window.Sound.playMechanicalClick();
                }
            }
        }
    }

    loop() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.loop());

        const delta = Math.min(this.clock.getDelta(), 0.1);

        // 1. Update Safe Zone & Airdrop
        this.world.updateSafeZone(delta);
        this.world.updateAirdrop(delta);

        // 2. Update Player
        this.player.update(delta, this.world, this.bots);

        // 3. Update AI Bots
        for (let bot of this.bots) {
            bot.update(delta, this.player, this.bots, this.world);
        }

        // 4. Check Loot pickups
        this.checkLootPickup();

        // 5. Update UI & Minimap
        this.ui.update(this.player, this.bots, this.world, this.camera);

        // 6. Render 3D Scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new GameEngine();
});
