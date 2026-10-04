/**
 * Free Fire 4K - Weapons & Ballistics System
 */

const WEAPON_CONFIGS = {
    ak47: {
        id: 'ak47',
        name: 'AK-47',
        category: 'Assault Rifle',
        damage: 34,
        headshotMultiplier: 2.5,
        fireRate: 0.11, // seconds between shots (~545 RPM)
        magSize: 30,
        reserveAmmo: 150,
        reloadTime: 1.8,
        spread: 0.022,
        adsSpreadMultiplier: 0.35,
        recoilVertical: 0.028,
        recoilHorizontal: 0.012,
        tracerColor: 0xffa500,
        muzzleFlashColor: 0xffaa33,
        sound: 'ak47',
        isAuto: true,
        hasScope: false,
        zoomFOV: 55
    },
    awm: {
        id: 'awm',
        name: 'AWM',
        category: 'Sniper Rifle',
        damage: 130,
        headshotMultiplier: 2.2, // ~286 damage (Instant kill!)
        fireRate: 1.25,
        magSize: 5,
        reserveAmmo: 30,
        reloadTime: 2.4,
        spread: 0.04, // hipfire is inaccurate
        adsSpreadMultiplier: 0.001, // pinpoint accuracy when scoped
        recoilVertical: 0.07,
        recoilHorizontal: 0.02,
        tracerColor: 0x40e0d0,
        muzzleFlashColor: 0x88eeff,
        sound: 'awm',
        isAuto: false,
        hasScope: true,
        zoomFOV: 18 // High magnification 8x scope
    },
    mp40: {
        id: 'mp40',
        name: 'MP40',
        category: 'SMG',
        damage: 22,
        headshotMultiplier: 2.4,
        fireRate: 0.075, // Rapid fire (~800 RPM)
        magSize: 32,
        reserveAmmo: 192,
        reloadTime: 1.5,
        spread: 0.035,
        adsSpreadMultiplier: 0.5,
        recoilVertical: 0.018,
        recoilHorizontal: 0.015,
        tracerColor: 0xffea00,
        muzzleFlashColor: 0xffea55,
        sound: 'mp40',
        isAuto: true,
        hasScope: false,
        zoomFOV: 60
    }
};

class WeaponManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.weapons = {};
        this.activeWeaponId = 'ak47';
        this.lastShotTime = 0;
        this.isReloading = false;
        this.reloadTimer = 0;
        this.recoilOffset = { x: 0, y: 0 };

        // Active particles & visual effects
        this.tracers = [];
        this.impactParticles = [];
        this.casingParticles = [];
        this.muzzleFlashes = [];

        // Initialize state for each weapon
        for (const key in WEAPON_CONFIGS) {
            const cfg = WEAPON_CONFIGS[key];
            this.weapons[key] = {
                ...cfg,
                currentMag: cfg.magSize,
                currentReserve: cfg.reserveAmmo
            };
        }

        // Shared geometries/materials for high performance
        this.tracerGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.8, 4);
        this.tracerGeo.rotateX(Math.PI / 2);

        this.sparkGeo = new THREE.BufferGeometry();
        const sparkVerts = new Float32Array(30 * 3);
        this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkVerts, 3));
    }

    getActiveWeapon() {
        return this.weapons[this.activeWeaponId];
    }

    switchWeapon(weaponId) {
        if (!this.weapons[weaponId] || this.activeWeaponId === weaponId) return false;
        if (this.isReloading) {
            this.isReloading = false;
        }
        this.activeWeaponId = weaponId;
        window.Sound.playMechanicalClick();
        return true;
    }

    canShoot(currentTime) {
        const weapon = this.getActiveWeapon();
        if (this.isReloading) return false;
        if (currentTime - this.lastShotTime < weapon.fireRate) return false;
        if (weapon.currentMag <= 0) {
            this.reload();
            return false;
        }
        return true;
    }

    reload() {
        const weapon = this.getActiveWeapon();
        if (this.isReloading) return false;
        if (weapon.currentMag >= weapon.magSize) return false;
        if (weapon.currentReserve <= 0) return false;

        this.isReloading = true;
        this.reloadTimer = weapon.reloadTime;
        window.Sound.playReload();
        return true;
    }

    update(delta, currentTime) {
        // Handle reload timer
        if (this.isReloading) {
            this.reloadTimer -= delta;
            if (this.reloadTimer <= 0) {
                const weapon = this.getActiveWeapon();
                const needed = weapon.magSize - weapon.currentMag;
                const available = Math.min(needed, weapon.currentReserve);
                weapon.currentMag += available;
                weapon.currentReserve -= available;
                this.isReloading = false;
            }
        }

        // Decay camera recoil smoothly
        this.recoilOffset.x *= Math.pow(0.05, delta);
        this.recoilOffset.y *= Math.pow(0.05, delta);

        // Update bullet tracers
        for (let i = this.tracers.length - 1; i >= 0; i--) {
            const tracer = this.tracers[i];
            tracer.life -= delta;
            if (tracer.life <= 0) {
                this.scene.remove(tracer.mesh);
                if (tracer.mesh.geometry) tracer.mesh.geometry.dispose();
                if (tracer.mesh.material) tracer.mesh.material.dispose();
                this.tracers.splice(i, 1);
            } else {
                tracer.mesh.position.addScaledVector(tracer.velocity, delta);
            }
        }

        // Update impact particles
        for (let i = this.impactParticles.length - 1; i >= 0; i--) {
            const p = this.impactParticles[i];
            p.life -= delta;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                this.impactParticles.splice(i, 1);
            } else {
                p.velocity.y -= 9.8 * delta; // gravity
                p.mesh.position.addScaledVector(p.velocity, delta);
                p.mesh.scale.multiplyScalar(0.92);
            }
        }

        // Update muzzle flashes (expire fast)
        for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
            const mf = this.muzzleFlashes[i];
            mf.life -= delta;
            if (mf.life <= 0) {
                this.scene.remove(mf.mesh);
                if (mf.light) this.scene.remove(mf.light);
                this.muzzleFlashes.splice(i, 1);
            }
        }
    }

    /**
     * Create high-fidelity visual tracer from muzzle to target hit
     */
    createTracer(startPos, endPos, color = 0xffaa00) {
        const dir = new THREE.Vector3().subVectors(endPos, startPos);
        const distance = dir.length();
        if (distance < 0.1) return;
        dir.normalize();

        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.95
        });
        const mesh = new THREE.Mesh(this.tracerGeo.clone(), mat);
        mesh.position.copy(startPos);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.scene.add(mesh);

        const speed = 240; // meters per second
        this.tracers.push({
            mesh: mesh,
            velocity: dir.clone().multiplyScalar(speed),
            life: Math.min(distance / speed, 0.45)
        });
    }

    /**
     * Create dynamic muzzle flash light & starburst
     */
    createMuzzleFlash(muzzlePos, color = 0xffaa22) {
        const flashGroup = new THREE.Group();

        // 3D starburst cross
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95
        });
        const plane1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), mat);
        const plane2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), mat);
        plane2.rotation.z = Math.PI / 4;
        flashGroup.add(plane1);
        flashGroup.add(plane2);
        flashGroup.position.copy(muzzlePos);
        this.scene.add(flashGroup);

        // Point light for illumination
        const light = new THREE.PointLight(color, 2.5, 6);
        light.position.copy(muzzlePos);
        this.scene.add(light);

        this.muzzleFlashes.push({
            mesh: flashGroup,
            light: light,
            life: 0.05
        });
    }

    /**
     * Create spark & dust debris particles at bullet impact point
     */
    createImpactEffect(hitPos, hitNormal, isFlesh = false) {
        const count = isFlesh ? 8 : 12;
        const color = isFlesh ? 0xcc1111 : 0xffcc44;

        for (let i = 0; i < count; i++) {
            const size = 0.04 + Math.random() * 0.05;
            const mat = new THREE.MeshBasicMaterial({
                color: isFlesh ? 0xb71c1c : (Math.random() > 0.5 ? 0xffcc00 : 0xffffff)
            });
            const geom = new THREE.BoxGeometry(size, size, size);
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.copy(hitPos);

            const spreadDir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 1.5,
                (Math.random() - 0.5) * 2
            );
            if (hitNormal) {
                spreadDir.addScaledVector(hitNormal, 1.2);
            }
            spreadDir.normalize();

            this.scene.add(mesh);
            this.impactParticles.push({
                mesh: mesh,
                velocity: spreadDir.multiplyScalar(4 + Math.random() * 6),
                life: 0.25 + Math.random() * 0.2
            });
        }
    }
}

window.WeaponManager = WeaponManager;
window.WEAPON_CONFIGS = WEAPON_CONFIGS;
