/**
 * Free Fire 4K - World, Map, Structures & Safe Zone
 * Procedural battleground environment inspired by Free Fire's Bermuda island.
 */

class WorldBuilder {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.lootBoxes = [];
        this.airdrop = null;
        this.airdropSmokeParticles = [];

        // Safe Zone State
        this.safeZone = {
            center: new THREE.Vector2(0, 0),
            targetCenter: new THREE.Vector2(10, -5),
            currentRadius: 210,
            targetRadius: 210,
            shrinkSpeed: 2.5,
            stage: 1,
            maxStages: 4,
            timer: 45, // seconds until next shrink
            isShrinking: false,
            mesh: null
        };

        // Cache procedural textures
        this.textures = this.generateTextures();
    }

    /**
     * Generate procedural textures with high visual fidelity
     */
    generateTextures() {
        const createNoiseCanvas = (w, h, baseColor, noiseColor, freq = 1) => {
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = baseColor;
            ctx.fillRect(0, 0, w, h);

            const imgData = ctx.getImageData(0, 0, w, h);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 40;
                data[i] = Math.min(255, Math.max(0, data[i] + noise));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
            }
            ctx.putImageData(imgData, 0, 0);

            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            return tex;
        };

        // 1. Terrain Grass Texture
        const grassTex = createNoiseCanvas(512, 512, '#3b6e22', '#2d561a');
        grassTex.repeat.set(40, 40);

        // 2. Asphalt Runway Texture with stripes
        const runwayCanvas = document.createElement('canvas');
        runwayCanvas.width = 512;
        runwayCanvas.height = 512;
        const rctx = runwayCanvas.getContext('2d');
        rctx.fillStyle = '#222225';
        rctx.fillRect(0, 0, 512, 512);
        // Yellow center dashes
        rctx.fillStyle = '#f5b041';
        for (let y = 30; y < 512; y += 90) {
            rctx.fillRect(250, y, 12, 50);
        }
        // White edge lines
        rctx.fillStyle = '#eeeeee';
        rctx.fillRect(20, 0, 10, 512);
        rctx.fillRect(482, 0, 10, 512);
        const runwayTex = new THREE.CanvasTexture(runwayCanvas);
        runwayTex.wrapS = THREE.RepeatWrapping;
        runwayTex.wrapT = THREE.RepeatWrapping;
        runwayTex.repeat.set(1, 10);

        // 3. Shipping Container Corrugated Metal Texture
        const containerCanvas = document.createElement('canvas');
        containerCanvas.width = 256;
        containerCanvas.height = 256;
        const cctx = containerCanvas.getContext('2d');
        cctx.fillStyle = '#888888';
        cctx.fillRect(0, 0, 256, 256);
        for (let x = 0; x < 256; x += 16) {
            cctx.fillStyle = '#222222';
            cctx.fillRect(x, 0, 3, 256);
            cctx.fillStyle = '#ffffff';
            cctx.fillRect(x + 3, 0, 3, 256);
        }
        const containerTex = new THREE.CanvasTexture(containerCanvas);
        containerTex.wrapS = THREE.RepeatWrapping;
        containerTex.wrapT = THREE.RepeatWrapping;
        containerTex.repeat.set(4, 2);

        // 4. Concrete Wall Texture
        const concreteTex = createNoiseCanvas(256, 256, '#6f7275', '#555759');
        concreteTex.repeat.set(3, 2);

        return { grassTex, runwayTex, containerTex, concreteTex };
    }

    buildMap() {
        this.buildTerrain();
        this.buildAirfield();
        this.buildShippingContainers();
        this.buildWatchtowers();
        this.buildMilitaryBunkers();
        this.buildCratesAndBarrels();
        this.buildFoliageAndRocks();
        this.createSafeZoneMesh();
        this.spawnAirdrop(new THREE.Vector3(15, 0, -20));
    }

    buildTerrain() {
        // High density ground plane
        const groundGeo = new THREE.PlaneGeometry(500, 500, 64, 64);
        groundGeo.rotateX(-Math.PI / 2);

        // Subtle undulating hillocks
        const pos = groundGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            // Flat near the center runway, gentle rolling hills at perimeter
            const dist = Math.sqrt(x * x + z * z);
            if (dist > 30) {
                const hill = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 2.5;
                pos.setY(i, hill);
            }
        }
        groundGeo.computeVertexNormals();

        const groundMat = new THREE.MeshStandardMaterial({
            map: this.textures.grassTex,
            roughness: 0.85,
            metalness: 0.1
        });
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.receiveShadow = true;
        this.scene.add(groundMesh);

        // Asphalt Airstrip (Free Fire style Runway)
        const runwayGeo = new THREE.PlaneGeometry(36, 240);
        runwayGeo.rotateX(-Math.PI / 2);
        const runwayMat = new THREE.MeshStandardMaterial({
            map: this.textures.runwayTex,
            roughness: 0.75,
            metalness: 0.2
        });
        const runwayMesh = new THREE.Mesh(runwayGeo, runwayMat);
        runwayMesh.position.set(0, 0.04, 0);
        runwayMesh.receiveShadow = true;
        this.scene.add(runwayMesh);
    }

    buildAirfield() {
        // Main Warehouse / Aircraft Hangar
        const hangar = new THREE.Group();
        hangar.position.set(-45, 0, -30);

        // Concrete Floor
        const floorGeo = new THREE.BoxGeometry(40, 0.4, 30);
        const floorMat = new THREE.MeshStandardMaterial({
            map: this.textures.concreteTex,
            roughness: 0.6
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = 0.2;
        floor.receiveShadow = true;
        hangar.add(floor);

        // Hangar walls (Left, Right, Back)
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x3d444d,
            map: this.textures.containerTex,
            roughness: 0.5,
            metalness: 0.5
        });

        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 30), wallMat);
        leftWall.position.set(-20, 5, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        hangar.add(leftWall);
        this.addCollider(-65, -30, 2, 30);

        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 30), wallMat);
        rightWall.position.set(20, 5, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        hangar.add(rightWall);
        this.addCollider(-25, -30, 2, 30);

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 1), wallMat);
        backWall.position.set(0, 5, -15);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        hangar.add(backWall);
        this.addCollider(-45, -45, 40, 2);

        // Curved Hangar Roof Trusses
        const roofGeo = new THREE.CylinderGeometry(21, 21, 30, 16, 1, false, 0, Math.PI);
        roofGeo.rotateZ(Math.PI / 2);
        roofGeo.rotateY(Math.PI / 2);
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0x4a535e,
            roughness: 0.6,
            metalness: 0.4,
            side: THREE.DoubleSide
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 10, 0);
        roof.castShadow = true;
        hangar.add(roof);

        this.scene.add(hangar);
    }

    buildShippingContainers() {
        // Colors: Red, Blue, Olive, Yellow
        const colors = [0xb71c1c, 0x0d47a1, 0x33691e, 0xf57f17];
        const containerSpawns = [
            { x: 30, z: 20, rot: 0, color: colors[0] },
            { x: 30, z: 35, rot: 0.2, color: colors[1] },
            { x: 42, z: 25, rot: Math.PI / 2, color: colors[2] },
            { x: 30, z: 20, y: 3.2, rot: 0.1, color: colors[3] }, // stacked on top!
            { x: -35, z: 45, rot: -0.4, color: colors[1] },
            { x: -45, z: 50, rot: 0.3, color: colors[0] },
            { x: 55, z: -40, rot: 0.8, color: colors[2] },
            { x: 60, z: -55, rot: 0, color: colors[0] },
            { x: -20, z: -60, rot: 1.2, color: colors[3] }
        ];

        containerSpawns.forEach(c => {
            const group = new THREE.Group();
            const geo = new THREE.BoxGeometry(12, 3.2, 4);
            const mat = new THREE.MeshStandardMaterial({
                color: c.color,
                map: this.textures.containerTex,
                roughness: 0.45,
                metalness: 0.6
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);

            group.position.set(c.x, (c.y || 0) + 1.6, c.z);
            group.rotation.y = c.rot;
            this.scene.add(group);

            this.addCollider(c.x, c.z, 6, 6);
        });
    }

    buildWatchtowers() {
        const towerPositions = [
            { x: 50, z: 60 },
            { x: -55, z: -70 }
        ];

        towerPositions.forEach(t => {
            const tower = new THREE.Group();
            tower.position.set(t.x, 0, t.z);

            // 4 Steel leg pillars
            const legGeo = new THREE.CylinderGeometry(0.2, 0.2, 10, 8);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
            const offsets = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
            offsets.forEach(([ox, oz]) => {
                const leg = new THREE.Mesh(legGeo, legMat);
                leg.position.set(ox, 5, oz);
                leg.castShadow = true;
                tower.add(leg);
            });

            // Sniper Platform
            const platGeo = new THREE.BoxGeometry(8, 0.5, 8);
            const platMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
            const plat = new THREE.Mesh(platGeo, platMat);
            plat.position.y = 10;
            plat.castShadow = true;
            plat.receiveShadow = true;
            tower.add(plat);

            // Guard railing
            const railMat = new THREE.MeshStandardMaterial({ color: 0xdd8800 });
            const railGeo = new THREE.BoxGeometry(8, 1, 0.2);
            const r1 = new THREE.Mesh(railGeo, railMat);
            r1.position.set(0, 10.7, -3.9);
            tower.add(r1);

            const r2 = new THREE.Mesh(railGeo, railMat);
            r2.position.set(0, 10.7, 3.9);
            tower.add(r2);

            this.scene.add(tower);
            this.addCollider(t.x, t.z, 4, 4);
        });
    }

    buildMilitaryBunkers() {
        const bunkerPositions = [
            { x: 0, z: 75 },
            { x: -10, z: -90 }
        ];

        bunkerPositions.forEach(b => {
            const bunker = new THREE.Group();
            bunker.position.set(b.x, 0, b.z);

            // Concrete Sandbag Barrier
            const barrierGeo = new THREE.BoxGeometry(10, 1.4, 1.2);
            const barrierMat = new THREE.MeshStandardMaterial({
                map: this.textures.concreteTex,
                roughness: 0.9
            });
            const barrier = new THREE.Mesh(barrierGeo, barrierMat);
            barrier.position.y = 0.7;
            barrier.castShadow = true;
            barrier.receiveShadow = true;
            bunker.add(barrier);

            this.scene.add(bunker);
            this.addCollider(b.x, b.z, 10, 2);
        });
    }

    buildCratesAndBarrels() {
        // Tactical wooden crates & explosive red barrels
        const crateMat = new THREE.MeshStandardMaterial({
            color: 0x8d6e63,
            roughness: 0.8,
            metalness: 0.1
        });
        const barrelMat = new THREE.MeshStandardMaterial({
            color: 0xd32f2f,
            roughness: 0.4,
            metalness: 0.6
        });

        const items = [
            { type: 'crate', x: 12, z: 10, s: 1.6 },
            { type: 'crate', x: 14, z: 11, s: 1.4 },
            { type: 'crate', x: -15, z: 25, s: 1.8 },
            { type: 'barrel', x: 16, z: 9, r: 0.6, h: 1.6 },
            { type: 'barrel', x: -18, z: 24, r: 0.6, h: 1.6 },
            { type: 'crate', x: 22, z: -35, s: 1.5 },
            { type: 'crate', x: -30, z: -15, s: 2.0 },
            { type: 'barrel', x: -32, z: -12, r: 0.6, h: 1.6 }
        ];

        items.forEach(it => {
            if (it.type === 'crate') {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(it.s, it.s, it.s), crateMat);
                mesh.position.set(it.x, it.s / 2, it.z);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.scene.add(mesh);
                this.addCollider(it.x, it.z, it.s, it.s);
            } else {
                const mesh = new THREE.Mesh(new THREE.CylinderGeometry(it.r, it.r, it.h, 12), barrelMat);
                mesh.position.set(it.x, it.h / 2, it.z);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.scene.add(mesh);
                this.addCollider(it.x, it.z, it.r * 2, it.r * 2);
            }
        });
    }

    buildFoliageAndRocks() {
        // Palm Trees & Tropical Foliage
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6, side: THREE.DoubleSide });
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x616161, roughness: 0.85 });

        // Scatter 25 trees around perimeter
        for (let i = 0; i < 28; i++) {
            const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.2;
            const dist = 70 + Math.random() * 80;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;

            const tree = new THREE.Group();
            tree.position.set(x, 0, z);

            // Trunk
            const trunkHeight = 9 + Math.random() * 4;
            const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = trunkHeight / 2;
            trunk.rotation.z = (Math.random() - 0.5) * 0.15;
            trunk.castShadow = true;
            tree.add(trunk);

            // Palm Canopy
            for (let f = 0; f < 7; f++) {
                const frondGeo = new THREE.ConeGeometry(3, 4, 4);
                frondGeo.rotateX(Math.PI / 2.5);
                const frond = new THREE.Mesh(frondGeo, leafMat);
                frond.position.y = trunkHeight;
                frond.rotation.y = (f / 7) * Math.PI * 2;
                frond.castShadow = true;
                tree.add(frond);
            }

            this.scene.add(tree);
            this.addCollider(x, z, 1.2, 1.2);
        }

        // Boulders / Rocks for tactical cover
        for (let r = 0; r < 14; r++) {
            const rx = (Math.random() - 0.5) * 220;
            const rz = (Math.random() - 0.5) * 220;
            if (Math.abs(rx) < 25 && Math.abs(rz) < 40) continue; // Keep runway clear

            const scale = 1.8 + Math.random() * 2.2;
            const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.set(rx, scale * 0.6, rz);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.castShadow = true;
            rock.receiveShadow = true;
            this.scene.add(rock);
            this.addCollider(rx, rz, scale * 1.5, scale * 1.5);
        }
    }

    addCollider(x, z, width, depth) {
        this.colliders.push({
            minX: x - width / 2,
            maxX: x + width / 2,
            minZ: z - depth / 2,
            maxZ: z + depth / 2
        });
    }

    checkCollision(pos, radius = 0.5) {
        for (let i = 0; i < this.colliders.length; i++) {
            const c = this.colliders[i];
            if (
                pos.x + radius > c.minX &&
                pos.x - radius < c.maxX &&
                pos.z + radius > c.minZ &&
                pos.z - radius < c.maxZ
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Create Glowing Safe Zone Electric Barrier (Free Fire Danger Zone)
     */
    createSafeZoneMesh() {
        const radius = this.safeZone.currentRadius;
        const height = 45;
        const geo = new THREE.CylinderGeometry(radius, radius, height, 48, 1, true);

        // Glowing Cyber Blue / Purple Shield material
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
            wireframe: false
        });

        this.safeZone.mesh = new THREE.Mesh(geo, mat);
        this.safeZone.mesh.position.set(this.safeZone.center.x, height / 2, this.safeZone.center.y);
        this.scene.add(this.safeZone.mesh);

        // Grid ring accents
        const ringGeo = new THREE.RingGeometry(radius - 0.4, radius + 0.4, 64);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            side: THREE.DoubleSide
        });
        this.safeZone.ringMesh = new THREE.Mesh(ringGeo, ringMat);
        this.safeZone.ringMesh.position.set(this.safeZone.center.x, 0.1, this.safeZone.center.y);
        this.scene.add(this.safeZone.ringMesh);
    }

    /**
     * Update Safe Zone shrinking and damage checks
     */
    updateSafeZone(delta) {
        const sz = this.safeZone;

        if (!sz.isShrinking) {
            sz.timer -= delta;
            if (sz.timer <= 0) {
                // Trigger shrink phase!
                sz.isShrinking = true;
                sz.stage++;
                if (sz.stage === 2) {
                    sz.targetRadius = 120;
                    sz.targetCenter.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
                } else if (sz.stage === 3) {
                    sz.targetRadius = 55;
                    sz.targetCenter.set((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
                } else {
                    sz.targetRadius = 20; // Final circle!
                }
                window.Sound.playZoneWarning();
            }
        } else {
            // Smoothly interpolate radius and center
            sz.currentRadius = THREE.MathUtils.lerp(sz.currentRadius, sz.targetRadius, delta * 0.12);
            sz.center.lerp(sz.targetCenter, delta * 0.12);

            // Re-scale mesh
            if (sz.mesh) {
                sz.mesh.scale.set(
                    sz.currentRadius / 210,
                    1,
                    sz.currentRadius / 210
                );
                sz.mesh.position.set(sz.center.x, 22.5, sz.center.y);
            }
            if (sz.ringMesh) {
                sz.ringMesh.scale.set(
                    sz.currentRadius / 210,
                    1,
                    sz.currentRadius / 210
                );
                sz.ringMesh.position.set(sz.center.x, 0.1, sz.center.y);
            }

            // Check if shrink finished
            if (Math.abs(sz.currentRadius - sz.targetRadius) < 1.0) {
                sz.currentRadius = sz.targetRadius;
                sz.isShrinking = false;
                sz.timer = 40; // 40 seconds wait until next shrink
            }
        }

        // Pulse mesh opacity
        if (sz.mesh) {
            sz.mesh.material.opacity = 0.22 + Math.sin(Date.now() * 0.003) * 0.08;
        }
    }

    /**
     * Check if a 3D position is outside the safe zone
     */
    isOutsideSafeZone(pos) {
        const dx = pos.x - this.safeZone.center.x;
        const dz = pos.z - this.safeZone.center.y;
        return Math.sqrt(dx * dx + dz * dz) > this.safeZone.currentRadius;
    }

    /**
     * Spawn Iconic Free Fire Airdrop Crate with red smoke flare!
     */
    spawnAirdrop(position) {
        const airdropGroup = new THREE.Group();
        airdropGroup.position.copy(position);

        // Gold & Black Airdrop Crate
        const crateGeo = new THREE.BoxGeometry(2.5, 2.2, 2.5);
        const crateMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37, // Metallic gold
            roughness: 0.3,
            metalness: 0.8
        });
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.y = 1.1;
        crate.castShadow = true;
        crate.receiveShadow = true;
        airdropGroup.add(crate);

        // Red flare canister on top
        const flareGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
        const flareMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
        const flare = new THREE.Mesh(flareGeo, flareMat);
        flare.position.y = 2.4;
        airdropGroup.add(flare);

        // Red Beacon Light
        const flareLight = new THREE.PointLight(0xff1744, 2.0, 15);
        flareLight.position.set(0, 3, 0);
        airdropGroup.add(flareLight);

        this.scene.add(airdropGroup);
        this.airdrop = {
            group: airdropGroup,
            position: position,
            looted: false
        };

        this.addCollider(position.x, position.z, 2.6, 2.6);
    }

    /**
     * Update Airdrop red smoke column
     */
    updateAirdrop(delta) {
        if (!this.airdrop || this.airdrop.looted) return;

        // Spawn red smoke puff every few frames
        if (Math.random() < 0.35) {
            const smokeMat = new THREE.MeshBasicMaterial({
                color: 0xff3355,
                transparent: true,
                opacity: 0.65
            });
            const smokeGeo = new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.25, 0);
            const smoke = new THREE.Mesh(smokeGeo, smokeMat);
            smoke.position.set(
                this.airdrop.position.x + (Math.random() - 0.5) * 0.4,
                this.airdrop.position.y + 2.5,
                this.airdrop.position.z + (Math.random() - 0.5) * 0.4
            );
            this.scene.add(smoke);

            this.airdropSmokeParticles.push({
                mesh: smoke,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    3.5 + Math.random() * 2.0,
                    (Math.random() - 0.5) * 0.5
                ),
                life: 2.2
            });
        }

        // Update smoke particles
        for (let i = this.airdropSmokeParticles.length - 1; i >= 0; i--) {
            const p = this.airdropSmokeParticles[i];
            p.life -= delta;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                this.airdropSmokeParticles.splice(i, 1);
            } else {
                p.mesh.position.addScaledVector(p.velocity, delta);
                p.mesh.scale.multiplyScalar(1.02);
                p.mesh.material.opacity = (p.life / 2.2) * 0.5;
            }
        }
    }
}

window.WorldBuilder = WorldBuilder;
