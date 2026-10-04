/**
 * Free Fire 4K - AI Combatant & Bot Agent System
 * Intelligent Battle Royale AI with combat behaviors, strafing, pathfinding & loot drops.
 */

const BOT_NAMES = [
    { name: 'Kelly', color: 0xffeb3b },     // Yellow tracksuit
    { name: 'Hayato', color: 0x3f51b5 },    // Blue samurai vest
    { name: 'Alok', color: 0x212121 },      // Black DJ jacket
    { name: 'Chrono', color: 0x00e5ff },    // Cybernetic cyan
    { name: 'Maxim', color: 0x4caf50 },     // Green hoodie
    { name: 'Moco', color: 0x00e676 },      // Hacker neon
    { name: 'Kla', color: 0xff5722 },       // Muay Thai orange
    { name: 'Laura', color: 0xe91e63 },     // Pink sharpshooter
    { name: 'Andrew', color: 0x795548 }     // Brown police vest
];

class Bot {
    constructor(scene, camera, config, spawnPos) {
        this.scene = scene;
        this.camera = camera;
        this.name = config.name;
        this.color = config.color;

        this.position = spawnPos.clone();
        this.velocity = new THREE.Vector3();
        this.yaw = Math.random() * Math.PI * 2;
        this.hp = 150;
        this.maxHp = 150;
        this.isDead = false;

        // AI States: 'patrol', 'combat', 'flee'
        this.state = 'patrol';
        this.patrolTarget = this.getRandomNavPoint();
        this.targetEnemy = null; // can be Player or another Bot

        // Combat timers
        this.lastShotTime = 0;
        this.burstCount = 0;
        this.fireInterval = 0.22;
        this.shootAccuracy = 0.08; // subtle spread

        // Animation
        this.animTime = Math.random() * 10;
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;
        this.strafeTimer = 1.5;

        // Build 3D Mesh
        this.mesh = this.buildBotMesh();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // Loot drop reference
        this.lootBox = null;
    }

    buildBotMesh() {
        const root = new THREE.Group();

        const skinMat = new THREE.MeshStandardMaterial({ color: 0xd29b71, roughness: 0.8 });
        const outfitMat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.5, metalness: 0.3 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.7 });
        const bootsMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });

        // 1. Torso
        const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
        this.torsoMesh = new THREE.Mesh(torsoGeo, outfitMat);
        this.torsoMesh.position.y = 1.35;
        this.torsoMesh.castShadow = true;
        root.add(this.torsoMesh);

        // 2. Head
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 1.95, 0);
        const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        this.headMesh = new THREE.Mesh(headGeo, skinMat);
        this.headMesh.castShadow = true;
        headGroup.add(this.headMesh);

        // Tactical headband/cap
        const capGeo = new THREE.BoxGeometry(0.38, 0.1, 0.38);
        const cap = new THREE.Mesh(capGeo, outfitMat);
        cap.position.y = 0.15;
        headGroup.add(cap);
        root.add(headGroup);
        this.headGroup = headGroup;

        // 3. Arms & Hands
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.45, 1.7, 0);
        const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), outfitMat);
        lArm.position.y = -0.35;
        this.leftArm.add(lArm);
        root.add(this.leftArm);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.45, 1.7, 0);
        const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), outfitMat);
        rArm.position.y = -0.35;
        this.rightArm.add(rArm);
        root.add(this.rightArm);

        // 4. Weapon
        this.weaponGroup = new THREE.Group();
        this.weaponGroup.position.set(0.25, 1.35, 0.4);
        const gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.7), gunMat);
        this.muzzlePoint = new THREE.Object3D();
        this.muzzlePoint.position.set(0, 0, 0.5);
        this.weaponGroup.add(gun);
        this.weaponGroup.add(this.muzzlePoint);
        root.add(this.weaponGroup);

        // 5. Legs
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.2, 0.9, 0);
        const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), pantsMat);
        lLeg.position.y = -0.45;
        const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.35), bootsMat);
        lBoot.position.set(0, -0.8, 0.05);
        lLeg.add(lBoot);
        this.leftLeg.add(lLeg);
        root.add(this.leftLeg);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.2, 0.9, 0);
        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), pantsMat);
        rLeg.position.y = -0.45;
        const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.35), bootsMat);
        rBoot.position.set(0, -0.8, 0.05);
        rLeg.add(rBoot);
        this.rightLeg.add(rLeg);
        root.add(this.rightLeg);

        return root;
    }

    getRandomNavPoint() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 80;
        return new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    }

    takeDamage(amount, attackerPos, isHeadshot, attackerName, weaponName) {
        if (this.isDead) return;
        this.hp -= amount;

        // Become alert to attacker!
        if (attackerPos) {
            const dir = new THREE.Vector3().subVectors(attackerPos, this.position).normalize();
            this.yaw = Math.atan2(dir.x, dir.z);
            this.state = 'combat';
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.die(attackerName, weaponName, isHeadshot);
        }
    }

    die(attackerName, weaponName, isHeadshot) {
        this.isDead = true;

        // Ragdoll collapse animation
        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.position.y = 0.3;

        // Drop glowing loot crate
        this.dropLoot();

        // Broadcast kill feed event
        if (window.UI) {
            window.UI.addFeedEntry(attackerName, this.name, weaponName, isHeadshot);
            window.UI.updateAliveCount();
        }

        if (attackerName === 'Player') {
            if (window.gameInstance && window.gameInstance.player) {
                window.gameInstance.player.kills++;
            }
        }
    }

    dropLoot() {
        const lootGroup = new THREE.Group();
        lootGroup.position.set(this.position.x, 0.4, this.position.z);

        // Glowing Military Crate
        const boxGeo = new THREE.BoxGeometry(0.9, 0.7, 0.9);
        const boxMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            roughness: 0.3,
            metalness: 0.7
        });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.castShadow = true;
        lootGroup.add(box);

        // Beacon glow
        const light = new THREE.PointLight(0x00e5ff, 1.2, 5);
        light.position.y = 0.8;
        lootGroup.add(light);

        this.scene.add(lootGroup);
        this.lootBox = lootGroup;

        if (window.gameInstance && window.gameInstance.world) {
            window.gameInstance.world.lootBoxes.push({
                mesh: lootGroup,
                pos: this.position.clone(),
                collected: false
            });
        }
    }

    update(delta, player, allBots, world) {
        if (this.isDead) return;

        const currentTime = performance.now() / 1000;

        // Safe zone damage tick for bot
        if (world.isOutsideSafeZone(this.position)) {
            this.takeDamage(12 * delta, null, false, 'The Zone', 'Electromagnetic Storm');
            if (this.isDead) return;
        }

        // 1. Perception: Check distance to Player
        const distToPlayer = this.position.distanceTo(player.position);
        let activeTarget = null;
        let targetPos = null;

        if (!player.isDead && distToPlayer < 75) {
            activeTarget = player;
            targetPos = player.position.clone();
        } else {
            // Find nearest alive bot to fight
            for (let other of allBots) {
                if (other === this || other.isDead) continue;
                const d = this.position.distanceTo(other.position);
                if (d < 45) {
                    activeTarget = other;
                    targetPos = other.position.clone();
                    break;
                }
            }
        }

        // 2. AI State Transition
        if (activeTarget) {
            this.state = 'combat';
        } else {
            this.state = 'patrol';
        }

        // 3. Behavior Execution
        if (this.state === 'combat' && targetPos) {
            // Face target
            const toTarget = new THREE.Vector3().subVectors(targetPos, this.position);
            const dist = toTarget.length();
            this.yaw = Math.atan2(toTarget.x, toTarget.z);

            // Strafe movement while in combat
            this.strafeTimer -= delta;
            if (this.strafeTimer <= 0) {
                this.strafeDir *= -1;
                this.strafeTimer = 1.0 + Math.random() * 1.5;
            }

            const strafeVec = new THREE.Vector3(this.strafeDir, 0, 0);
            strafeVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

            // Forward or backward approach
            if (dist > 35) {
                strafeVec.addScaledVector(toTarget.clone().normalize(), 1.0);
            } else if (dist < 15) {
                strafeVec.addScaledVector(toTarget.clone().normalize(), -0.8);
            }

            const moveStep = strafeVec.normalize().multiplyScalar(4.5 * delta);
            const nextPos = this.position.clone().add(moveStep);
            if (!world.checkCollision(nextPos, 0.5)) {
                this.position.copy(nextPos);
            }

            // Animate leg swings
            this.animTime += delta * 7;
            this.leftLeg.rotation.x = Math.sin(this.animTime) * 0.5;
            this.rightLeg.rotation.x = -Math.sin(this.animTime) * 0.5;

            // Combat Firing
            if (currentTime - this.lastShotTime > this.fireInterval) {
                this.fireAtTarget(activeTarget, targetPos, currentTime, world);
            }
        } else {
            // Patrol wander mode towards safe zone center
            const dirToNav = new THREE.Vector3().subVectors(this.patrolTarget, this.position);
            if (dirToNav.length() < 3 || world.isOutsideSafeZone(this.patrolTarget)) {
                // Pick point inside safe zone
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * (world.safeZone.currentRadius * 0.7);
                this.patrolTarget.set(
                    world.safeZone.center.x + Math.cos(angle) * r,
                    0,
                    world.safeZone.center.y + Math.sin(angle) * r
                );
            }

            dirToNav.normalize();
            this.yaw = THREE.MathUtils.lerp(this.yaw, Math.atan2(dirToNav.x, dirToNav.z), delta * 3);

            const nextPos = this.position.clone().addScaledVector(dirToNav, 3.8 * delta);
            if (!world.checkCollision(nextPos, 0.5)) {
                this.position.copy(nextPos);
            }

            this.animTime += delta * 6;
            this.leftLeg.rotation.x = Math.sin(this.animTime) * 0.4;
            this.rightLeg.rotation.x = -Math.sin(this.animTime) * 0.4;
        }

        // Sync mesh transform
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.rotation.y = this.yaw;
    }

    fireAtTarget(target, targetPos, currentTime, world) {
        this.lastShotTime = currentTime;
        this.burstCount++;

        // Add pause after 4 burst shots
        if (this.burstCount >= 4) {
            this.lastShotTime += 0.8 + Math.random() * 0.6;
            this.burstCount = 0;
        }

        // Muzzle position
        const muzzlePos = new THREE.Vector3();
        this.muzzlePoint.getWorldPosition(muzzlePos);

        // Flash & Tracer
        if (window.gameInstance && window.gameInstance.player && window.gameInstance.player.weaponManager) {
            const wm = window.gameInstance.player.weaponManager;
            wm.createMuzzleFlash(muzzlePos, 0xff7722);

            // Calculate trajectory with spread
            const aimPos = targetPos.clone().add(new THREE.Vector3(0, 1.4, 0));
            aimPos.x += (Math.random() - 0.5) * 1.5;
            aimPos.y += (Math.random() - 0.5) * 1.2;
            aimPos.z += (Math.random() - 0.5) * 1.5;

            wm.createTracer(muzzlePos, aimPos, 0xff5533);

            // Play gunshot sound at distance
            const distToPlayer = this.position.distanceTo(window.gameInstance.player.position);
            if (distToPlayer < 90) {
                window.Sound.playGunshot('ak47');
            }

            // Hit check
            const hitRoll = Math.random();
            // Higher hit chance if target is close
            const hitThreshold = distToPlayer < 20 ? 0.45 : (distToPlayer < 50 ? 0.3 : 0.15);

            if (hitRoll < hitThreshold) {
                const damage = 14 + Math.floor(Math.random() * 10);
                if (target === window.gameInstance.player) {
                    target.takeDamage(damage, this.position);
                } else if (target instanceof Bot) {
                    target.takeDamage(damage, this.position, false, this.name, 'AK-47');
                }
            }
        }
    }
}

window.Bot = Bot;
window.BOT_NAMES = BOT_NAMES;
