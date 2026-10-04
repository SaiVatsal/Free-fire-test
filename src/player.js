/**
 * Free Fire 4K - Third-Person Player Controller & Character Rig
 */

class Player {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;

        // Position & Physics
        this.position = new THREE.Vector3(0, 0, 15);
        this.velocity = new THREE.Vector3();
        this.isGrounded = true;
        this.isCrouching = false;
        this.isSprinting = false;
        this.isAiming = false; // ADS / Scope
        this.isDead = false;

        // Rotation angles
        this.yaw = 0;   // Left-right rotation
        this.pitch = 0; // Up-down look angle

        // Stats (Free Fire Standard)
        this.hp = 200;
        this.maxHp = 200;
        this.armor = 100;
        this.maxArmor = 100;
        this.medkits = 3;
        this.kills = 0;
        this.damageDealt = 0;

        // Healing state
        this.isHealing = false;
        this.healTimer = 0;

        // Speed settings
        this.walkSpeed = 7.5;
        this.sprintSpeed = 12.0;
        this.crouchSpeed = 4.0;
        this.jumpForce = 9.5;
        this.gravity = 24.0;

        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            sprint: false,
            crouch: false,
            jump: false
        };
        this.mouse = {
            leftDown: false,
            rightDown: false
        };

        // Animation timers
        this.animTime = 0;
        this.footstepTimer = 0;

        // Setup 3D Character Model and Rig
        this.mesh = this.buildCharacterMesh();
        this.scene.add(this.mesh);

        // Weapon Manager
        this.weaponManager = new WeaponManager(this.scene, this.camera);

        // Pointer Lock & Controls
        this.setupEventListeners();
    }

    buildCharacterMesh() {
        const root = new THREE.Group();

        // Camouflage Military Textures
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xd29b71, roughness: 0.8 });
        const vestMat = new THREE.MeshStandardMaterial({ color: 0x2e3532, roughness: 0.6, metalness: 0.4 }); // Tactical Kevlar
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3d4b3b, roughness: 0.7 }); // Camo pants
        const bootsMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0x273024, roughness: 0.5, metalness: 0.5 });
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff }); // Cyber cyan visor

        // 1. Torso & Armor Vest
        const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
        const torso = new THREE.Mesh(torsoGeo, vestMat);
        torso.position.y = 1.35;
        torso.castShadow = true;
        root.add(torso);
        this.torsoMesh = torso;

        // 2. Head & Tactical Helmet
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 1.95, 0);

        const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.castShadow = true;
        headGroup.add(head);

        const helmetGeo = new THREE.BoxGeometry(0.42, 0.28, 0.42);
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.set(0, 0.1, 0);
        helmet.castShadow = true;
        headGroup.add(helmet);

        const visorGeo = new THREE.BoxGeometry(0.32, 0.08, 0.08);
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.03, 0.18);
        headGroup.add(visor);

        root.add(headGroup);
        this.headMesh = headGroup;

        // 3. Arms & Hands
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.45, 1.7, 0);
        const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), vestMat);
        lArmMesh.position.y = -0.35;
        lArmMesh.castShadow = true;
        this.leftArm.add(lArmMesh);
        root.add(this.leftArm);

        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.45, 1.7, 0);
        const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), vestMat);
        rArmMesh.position.y = -0.35;
        rArmMesh.castShadow = true;
        this.rightArm.add(rArmMesh);
        root.add(this.rightArm);

        // 4. Weapon Rig in Hands
        this.weaponRig = new THREE.Group();
        this.weaponRig.position.set(0.25, 1.35, 0.45);
        
        // Weapon 3D Model (Military rifle)
        const gunBodyMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, metalness: 0.8, roughness: 0.3 });
        const gunBarrelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });
        const gunStockMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });

        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.6), gunBodyMat);
        const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), gunBarrelMat);
        gunBarrel.rotateX(Math.PI / 2);
        gunBarrel.position.set(0, 0.02, 0.45);
        const gunStock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.3), gunStockMat);
        gunStock.position.set(0, -0.04, -0.35);

        // Muzzle point marker (for tracers and flashes)
        this.muzzlePoint = new THREE.Object3D();
        this.muzzlePoint.position.set(0, 0.02, 0.75);

        this.weaponRig.add(gunBody);
        this.weaponRig.add(gunBarrel);
        this.weaponRig.add(gunStock);
        this.weaponRig.add(this.muzzlePoint);
        root.add(this.weaponRig);

        // 5. Legs
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.2, 0.9, 0);
        const lLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), pantsMat);
        lLegMesh.position.y = -0.45;
        lLegMesh.castShadow = true;
        const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.35), bootsMat);
        lBoot.position.set(0, -0.8, 0.05);
        lLegMesh.add(lBoot);
        this.leftLeg.add(lLegMesh);
        root.add(this.leftLeg);

        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.2, 0.9, 0);
        const rLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), pantsMat);
        rLegMesh.position.y = -0.45;
        rLegMesh.castShadow = true;
        const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.35), bootsMat);
        rBoot.position.set(0, -0.8, 0.05);
        rLegMesh.add(rBoot);
        this.rightLeg.add(rLegMesh);
        root.add(this.rightLeg);

        return root;
    }

    setupEventListeners() {
        // Pointer lock request
        this.domElement.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                this.domElement.requestPointerLock();
                window.Sound.ensureContext();
            }
        });

        // Mouse look
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement !== this.domElement || this.isDead) return;

            const sensitivity = 0.0022;
            const adsMultiplier = this.isAiming ? 0.45 : 1.0;

            this.yaw -= e.movementX * sensitivity * adsMultiplier;
            this.pitch -= e.movementY * sensitivity * adsMultiplier;

            // Clamp vertical pitch (-80 to +80 deg)
            this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
        });

        // Mouse clicks
        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement !== this.domElement || this.isDead) return;
            if (e.button === 0) {
                this.mouse.leftDown = true;
            } else if (e.button === 2) {
                this.mouse.rightDown = true;
                this.isAiming = true;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.leftDown = false;
            } else if (e.button === 2) {
                this.mouse.rightDown = false;
                this.isAiming = false;
            }
        });

        // Context menu prevent (right click aim)
        document.addEventListener('contextmenu', e => e.preventDefault());

        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (this.isDead) return;
            switch (e.code) {
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys.sprint = true;
                    break;
                case 'KeyC':
                    this.isCrouching = !this.isCrouching;
                    break;
                case 'Space':
                    if (this.isGrounded) {
                        this.velocity.y = this.jumpForce;
                        this.isGrounded = false;
                    }
                    break;
                case 'Digit1':
                    this.weaponManager.switchWeapon('ak47');
                    break;
                case 'Digit2':
                    this.weaponManager.switchWeapon('awm');
                    break;
                case 'Digit3':
                    this.weaponManager.switchWeapon('mp40');
                    break;
                case 'KeyR':
                    this.weaponManager.reload();
                    break;
                case 'KeyE':
                    this.useMedkit();
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys.sprint = false;
                    break;
            }
        });

        // Mouse wheel weapon cycle
        window.addEventListener('wheel', (e) => {
            if (document.pointerLockElement !== this.domElement || this.isDead) return;
            const weapons = ['ak47', 'awm', 'mp40'];
            let idx = weapons.indexOf(this.weaponManager.activeWeaponId);
            if (e.deltaY > 0) {
                idx = (idx + 1) % weapons.length;
            } else {
                idx = (idx - 1 + weapons.length) % weapons.length;
            }
            this.weaponManager.switchWeapon(weapons[idx]);
        });
    }

    useMedkit() {
        if (this.medkits <= 0 || this.hp >= this.maxHp || this.isHealing) return;
        this.isHealing = true;
        this.healTimer = 3.0; // 3 seconds to apply
        window.Sound.playHeal();
    }

    takeDamage(amount, sourcePos) {
        if (this.isDead) return;

        // Armor absorbs 60% of incoming damage
        if (this.armor > 0) {
            const armorAbsorb = amount * 0.6;
            if (this.armor >= armorAbsorb) {
                this.armor -= armorAbsorb;
                this.hp -= (amount - armorAbsorb);
            } else {
                const remaining = amount - this.armor;
                this.armor = 0;
                this.hp -= remaining;
            }
        } else {
            this.hp -= amount;
        }

        // Hit flash UI callback
        if (window.UI) {
            window.UI.flashDamageIndicator();
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    die() {
        this.isDead = true;
        window.Sound.playDefeat();
        // Collapse ragdoll animation
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = 0.3;
        if (window.UI) {
            window.UI.showDefeatScreen();
        }
    }

    update(delta, world, bots) {
        if (this.isDead) return;

        const currentTime = performance.now() / 1000;
        this.weaponManager.update(delta, currentTime);

        // Handle healing
        if (this.isHealing) {
            this.healTimer -= delta;
            if (this.healTimer <= 0) {
                this.hp = Math.min(this.maxHp, this.hp + 75);
                this.medkits--;
                this.isHealing = false;
            }
        }

        // Safe zone damage tick
        if (world.isOutsideSafeZone(this.position)) {
            this.takeDamage(12 * delta, null); // 12 DPS outside zone
        }

        // Movement Speed Calculation
        let currentSpeed = this.walkSpeed;
        if (this.isCrouching) {
            currentSpeed = this.crouchSpeed;
        } else if (this.keys.sprint && this.keys.forward && !this.isAiming) {
            currentSpeed = this.sprintSpeed;
            this.isSprinting = true;
        } else {
            this.isSprinting = false;
        }

        // Direction Vector from Inputs
        const moveDir = new THREE.Vector3();
        if (this.keys.forward) moveDir.z -= 1;
        if (this.keys.backward) moveDir.z += 1;
        if (this.keys.left) moveDir.x -= 1;
        if (this.keys.right) moveDir.x += 1;

        const isMoving = moveDir.lengthSq() > 0;
        if (isMoving) {
            moveDir.normalize();
            // Transform movement direction relative to camera yaw
            moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

            // Attempt movement with collision test
            const nextPos = this.position.clone().addScaledVector(moveDir, currentSpeed * delta);
            if (!world.checkCollision(nextPos, 0.5)) {
                this.position.x = nextPos.x;
                this.position.z = nextPos.z;
            }

            // Footsteps
            this.footstepTimer -= delta;
            if (this.footstepTimer <= 0 && this.isGrounded) {
                window.Sound.playFootstep();
                this.footstepTimer = this.isSprinting ? 0.28 : 0.42;
            }

            // Animate leg swings
            this.animTime += delta * (this.isSprinting ? 14 : 9);
            this.leftLeg.rotation.x = Math.sin(this.animTime) * 0.7;
            this.rightLeg.rotation.x = -Math.sin(this.animTime) * 0.7;
            this.leftArm.rotation.x = -Math.sin(this.animTime) * 0.4;
        } else {
            // Idle breathing animation
            this.leftLeg.rotation.x *= 0.8;
            this.rightLeg.rotation.x *= 0.8;
            this.leftArm.rotation.x *= 0.8;
            this.mesh.position.y = this.position.y + Math.sin(Date.now() * 0.003) * 0.02;
        }

        // Vertical Gravity & Jump Physics
        if (!this.isGrounded) {
            this.velocity.y -= this.gravity * delta;
            this.position.y += this.velocity.y * delta;
            if (this.position.y <= 0) {
                this.position.y = 0;
                this.velocity.y = 0;
                this.isGrounded = true;
            }
        }

        // Crouch height offset
        const targetScaleY = this.isCrouching ? 0.65 : 1.0;
        this.mesh.scale.y = THREE.MathUtils.lerp(this.mesh.scale.y, targetScaleY, delta * 12);

        // Update mesh position and orientation
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.rotation.y = this.yaw;

        // Weapon Rig alignment & aim pitch
        this.weaponRig.rotation.x = this.pitch;
        this.headMesh.rotation.x = this.pitch * 0.6;

        // Check weapon firing
        const activeWeapon = this.weaponManager.getActiveWeapon();
        if (this.mouse.leftDown && (activeWeapon.isAuto || !this.hasFiredSingle)) {
            if (this.weaponManager.canShoot(currentTime)) {
                this.fireWeapon(currentTime, bots, world);
                if (!activeWeapon.isAuto) {
                    this.hasFiredSingle = true;
                }
            }
        }
        if (!this.mouse.leftDown) {
            this.hasFiredSingle = false;
        }

        // Smooth Camera Update
        this.updateCamera(delta);
    }

    fireWeapon(currentTime, bots, world) {
        const weapon = this.weaponManager.getActiveWeapon();
        this.weaponManager.lastShotTime = currentTime;
        weapon.currentMag--;

        // Play weapon gunshot
        window.Sound.playGunshot(weapon.sound);

        // Camera recoil kick
        const recoilV = weapon.recoilVertical * (this.isCrouching ? 0.6 : 1.0) * (this.isAiming ? 0.5 : 1.0);
        const recoilH = (Math.random() - 0.5) * weapon.recoilHorizontal;
        this.pitch += recoilV;
        this.yaw += recoilH;

        // Muzzle position in world coordinates
        const muzzleWorldPos = new THREE.Vector3();
        this.muzzlePoint.getWorldPosition(muzzleWorldPos);

        // Visual Muzzle Flash
        this.weaponManager.createMuzzleFlash(muzzleWorldPos, weapon.muzzleFlashColor);

        // Calculate Raycast direction with spread
        const cameraDir = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDir);

        let spread = weapon.spread;
        if (this.isAiming) spread *= weapon.adsSpreadMultiplier;
        if (this.isCrouching) spread *= 0.6;
        if (this.isSprinting) spread *= 1.8;

        cameraDir.x += (Math.random() - 0.5) * spread;
        cameraDir.y += (Math.random() - 0.5) * spread;
        cameraDir.z += (Math.random() - 0.5) * spread;
        cameraDir.normalize();

        // Perform raycast
        const raycaster = new THREE.Raycaster(this.camera.position, cameraDir, 0.1, 400);

        // Test bots collision
        let closestHit = null;
        let hitBot = null;
        let isHeadshot = false;

        if (bots && bots.length) {
            for (let b of bots) {
                if (b.isDead) continue;
                // Test head mesh vs body mesh
                const headHits = raycaster.intersectObject(b.headMesh, true);
                if (headHits.length > 0) {
                    if (!closestHit || headHits[0].distance < closestHit.distance) {
                        closestHit = headHits[0];
                        hitBot = b;
                        isHeadshot = true;
                    }
                }
                const bodyHits = raycaster.intersectObject(b.torsoMesh, true);
                if (bodyHits.length > 0) {
                    if (!closestHit || bodyHits[0].distance < closestHit.distance) {
                        closestHit = bodyHits[0];
                        hitBot = b;
                        isHeadshot = false;
                    }
                }
            }
        }

        // Helper to check if an object belongs to a hierarchy
        const isDescendantOf = (obj, parent) => {
            if (!parent) return false;
            let curr = obj;
            while (curr) {
                if (curr === parent) return true;
                curr = curr.parent;
            }
            return false;
        };

        // Test world objects
        const worldHits = raycaster.intersectObjects(this.scene.children, true);
        const validWorldHits = worldHits.filter(h => {
            if (!h.object || !h.object.visible) return false;
            if (isDescendantOf(h.object, this.mesh)) return false; // Don't hit self!
            if (world.safeZone && (isDescendantOf(h.object, world.safeZone.mesh) || isDescendantOf(h.object, world.safeZone.ringMesh))) return false;
            if (bots) {
                for (let b of bots) {
                    if (isDescendantOf(h.object, b.mesh)) return false;
                }
            }
            return true;
        });

        if (validWorldHits.length > 0) {
            if (!closestHit || validWorldHits[0].distance < closestHit.distance) {
                // World geometry hit
                closestHit = validWorldHits[0];
                hitBot = null;
            }
        }

        const targetPos = closestHit ? closestHit.point : this.camera.position.clone().addScaledVector(cameraDir, 250);

        // Spawn bullet tracer
        this.weaponManager.createTracer(muzzleWorldPos, targetPos, weapon.tracerColor);

        // Process bot hit
        if (hitBot) {
            let finalDamage = weapon.damage;
            if (isHeadshot) {
                finalDamage = Math.round(finalDamage * weapon.headshotMultiplier);
            }
            this.damageDealt += finalDamage;

            // Audio & UI hitmarker
            window.Sound.playHitmarker(isHeadshot);
            if (window.UI) {
                window.UI.showHitmarker(isHeadshot);
                window.UI.showFloatingDamage(targetPos, finalDamage, isHeadshot);
            }

            // Flesh impact particles
            this.weaponManager.createImpactEffect(targetPos, closestHit.face ? closestHit.face.normal : null, true);

            // Apply damage to bot
            hitBot.takeDamage(finalDamage, this.position, isHeadshot, 'Player', weapon.name);
        } else if (closestHit) {
            // Spark & dust impact
            this.weaponManager.createImpactEffect(targetPos, closestHit.face ? closestHit.face.normal : null, false);
        }
    }

    updateCamera(delta) {
        // Third Person Camera Placement
        // Hipfire offset vs ADS offset
        const targetOffset = this.isAiming
            ? new THREE.Vector3(0.45, 1.6, 1.4)
            : new THREE.Vector3(0.85, 1.85, 3.4);

        if (this.isCrouching) {
            targetOffset.y -= 0.45;
        }

        // Rotate offset by camera yaw & pitch
        const rotatedOffset = targetOffset.clone();
        rotatedOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
        rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        // Desired camera position
        const targetCamPos = this.position.clone().add(rotatedOffset);

        // Smooth camera damping
        this.camera.position.lerp(targetCamPos, delta * 18);

        // Look-at point slightly in front of player
        const lookDir = new THREE.Vector3(0, 0, -1);
        lookDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
        lookDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        const lookAtPos = this.camera.position.clone().addScaledVector(lookDir, 20);
        this.camera.lookAt(lookAtPos);

        // Dynamic FOV zoom for scope
        const activeWeapon = this.weaponManager.getActiveWeapon();
        const targetFOV = this.isAiming ? activeWeapon.zoomFOV : 75;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, delta * 16);
        this.camera.updateProjectionMatrix();
    }
}

window.Player = Player;
