/**
 * Free Fire 4K - UI, HUD, Minimap, Damage Numbers & Screen Effects
 */

class UIManager {
    constructor() {
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        this.damageContainer = document.getElementById('damage-numbers-container');
        this.killFeedContainer = document.getElementById('kill-feed');
        this.scopeOverlay = document.getElementById('sniper-scope-overlay');
        this.crosshair = document.getElementById('crosshair');
        this.hitmarker = document.getElementById('hitmarker');
        this.damageVignette = document.getElementById('damage-vignette');

        // Gunfire pings on minimap
        this.radarPings = [];

        // Setup settings listeners
        this.setupSettingsUI();
    }

    setupSettingsUI() {
        const sensSlider = document.getElementById('sensitivity-slider');
        if (sensSlider) {
            sensSlider.addEventListener('input', (e) => {
                if (window.gameInstance && window.gameInstance.player) {
                    window.gameInstance.mouseSensitivity = parseFloat(e.target.value);
                }
            });
        }

        const volSlider = document.getElementById('volume-slider');
        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                window.Sound.setVolume(parseFloat(e.target.value));
            });
        }

        const graphicsSelect = document.getElementById('graphics-select');
        if (graphicsSelect) {
            graphicsSelect.addEventListener('change', (e) => {
                if (window.gameInstance) {
                    window.gameInstance.setGraphicsPreset(e.target.value);
                }
            });
        }
    }

    update(player, bots, world, camera) {
        if (!player) return;

        // 1. Health & Armor Bars
        const hpBar = document.getElementById('hp-bar');
        const hpText = document.getElementById('hp-text');
        const armorBar = document.getElementById('armor-bar');
        const armorText = document.getElementById('armor-text');

        if (hpBar && hpText) {
            const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
            hpBar.style.width = `${hpPct}%`;
            hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
            if (hpPct < 25) {
                hpBar.style.background = '#ff1744';
            } else {
                hpBar.style.background = 'linear-gradient(90deg, #ff9100, #00e676)';
            }
        }

        if (armorBar && armorText) {
            const armorPct = Math.max(0, Math.min(100, (player.armor / player.maxArmor) * 100));
            armorBar.style.width = `${armorPct}%`;
            armorText.textContent = `${Math.ceil(player.armor)} / ${player.maxArmor}`;
        }

        // 2. Medkit Count & Healing progress
        const medkitBadge = document.getElementById('medkit-badge');
        const healIndicator = document.getElementById('heal-indicator');
        if (medkitBadge) {
            medkitBadge.textContent = `x${player.medkits}`;
        }
        if (healIndicator) {
            if (player.isHealing) {
                healIndicator.style.display = 'block';
                const pct = Math.max(0, ((3.0 - player.healTimer) / 3.0) * 100);
                document.getElementById('heal-progress-fill').style.width = `${pct}%`;
            } else {
                healIndicator.style.display = 'none';
            }
        }

        // 3. Weapon HUD
        const weapon = player.weaponManager.getActiveWeapon();
        const weaponNameEl = document.getElementById('weapon-name');
        const ammoMagEl = document.getElementById('ammo-mag');
        const ammoReserveEl = document.getElementById('ammo-reserve');
        const reloadNoticeEl = document.getElementById('reload-notice');

        if (weaponNameEl) weaponNameEl.textContent = weapon.name;
        if (ammoMagEl) ammoMagEl.textContent = weapon.currentMag;
        if (ammoReserveEl) ammoReserveEl.textContent = weapon.currentReserve;

        if (reloadNoticeEl) {
            if (player.weaponManager.isReloading) {
                reloadNoticeEl.style.display = 'block';
                reloadNoticeEl.textContent = 'RELOADING...';
            } else if (weapon.currentMag === 0) {
                reloadNoticeEl.style.display = 'block';
                reloadNoticeEl.textContent = 'PRESS [R] TO RELOAD';
            } else {
                reloadNoticeEl.style.display = 'none';
            }
        }

        // Highlight active weapon slot
        const slotAK = document.getElementById('slot-ak47');
        const slotAWM = document.getElementById('slot-awm');
        const slotMP40 = document.getElementById('slot-mp40');
        if (slotAK) slotAK.classList.toggle('active', weapon.id === 'ak47');
        if (slotAWM) slotAWM.classList.toggle('active', weapon.id === 'awm');
        if (slotMP40) slotMP40.classList.toggle('active', weapon.id === 'mp40');

        // 4. Kills & Alive Counter
        const aliveEl = document.getElementById('alive-count');
        const killsEl = document.getElementById('kill-count');
        if (aliveEl) {
            const aliveBots = bots.filter(b => !b.isDead).length;
            const totalAlive = (player.isDead ? 0 : 1) + aliveBots;
            aliveEl.textContent = totalAlive;

            // Check Booyah Victory Condition!
            if (totalAlive === 1 && !player.isDead && !window.gameInstance.hasWon) {
                window.gameInstance.triggerVictory();
            }
        }
        if (killsEl) killsEl.textContent = player.kills;

        // 5. Zone Status & Timer
        const zoneTimerEl = document.getElementById('zone-timer');
        const zoneStatusEl = document.getElementById('zone-status');
        if (zoneTimerEl && zoneStatusEl) {
            if (world.safeZone.isShrinking) {
                zoneStatusEl.textContent = 'ZONE SHRINKING!';
                zoneStatusEl.style.color = '#ff1744';
                zoneTimerEl.textContent = 'WARNING';
            } else {
                zoneStatusEl.textContent = `SAFE ZONE (${world.safeZone.stage}/${world.safeZone.maxStages})`;
                zoneStatusEl.style.color = '#00e5ff';
                const secs = Math.ceil(world.safeZone.timer);
                const m = Math.floor(secs / 60);
                const s = secs % 60;
                zoneTimerEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
            }
        }

        // 6. Compass Heading Bar
        this.updateCompass(player.yaw);

        // 7. Dynamic Crosshair & Scope
        if (this.scopeOverlay) {
            if (player.isAiming && weapon.hasScope) {
                this.scopeOverlay.style.display = 'block';
                if (this.crosshair) this.crosshair.style.display = 'none';
            } else {
                this.scopeOverlay.style.display = 'none';
                if (this.crosshair) this.crosshair.style.display = 'block';
            }
        }

        // 8. Render Radar / Minimap
        this.renderMinimap(player, bots, world);
    }

    updateCompass(yaw) {
        const compassTape = document.getElementById('compass-tape');
        if (!compassTape) return;
        // Convert radians to degrees (0 to 360)
        let deg = THREE.MathUtils.radToDeg(yaw) % 360;
        if (deg < 0) deg += 360;
        // Offset tape position
        const px = -(deg * 4.0);
        compassTape.style.transform = `translateX(${px}px)`;
    }

    renderMinimap(player, bots, world) {
        if (!this.minimapCtx) return;
        const ctx = this.minimapCtx;
        const size = this.minimapCanvas.width;
        const center = size / 2;
        const scale = 0.55; // Pixels per meter

        // Clear radar
        ctx.clearRect(0, 0, size, size);

        // Clip to circular radar
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, center - 2, 0, Math.PI * 2);
        ctx.clip();

        // Background terrain radar tone
        ctx.fillStyle = '#131b1c';
        ctx.fillRect(0, 0, size, size);

        // Grid lines
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
        ctx.lineWidth = 1;
        for (let x = 0; x < size; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, x);
            ctx.lineTo(size, x);
            ctx.stroke();
        }

        // Draw Safe Zone (Blue Ring)
        const sz = world.safeZone;
        const szRelX = center + (sz.center.x - player.position.x) * scale;
        const szRelY = center + (sz.center.y - player.position.z) * scale;
        const szRadius = sz.currentRadius * scale;

        ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(szRelX, szRelY, szRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 180, 255, 0.08)';
        ctx.fill();

        // Draw Airdrop marker
        if (world.airdrop && !world.airdrop.looted) {
            const adX = center + (world.airdrop.position.x - player.position.x) * scale;
            const adY = center + (world.airdrop.position.z - player.position.z) * scale;
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.arc(adX, adY, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff1744';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw Loot Crates
        if (world.lootBoxes) {
            ctx.fillStyle = '#00e5ff';
            for (let lb of world.lootBoxes) {
                const lbX = center + (lb.pos.x - player.position.x) * scale;
                const lbY = center + (lb.pos.z - player.position.z) * scale;
                ctx.fillRect(lbX - 2.5, lbY - 2.5, 5, 5);
            }
        }

        // Draw Bots (red dots when within detection radius)
        for (let b of bots) {
            if (b.isDead) continue;
            const bRelX = center + (b.position.x - player.position.x) * scale;
            const bRelY = center + (b.position.z - player.position.z) * scale;

            // Only draw if within radar perimeter
            const d = Math.hypot(bRelX - center, bRelY - center);
            if (d < center - 6) {
                ctx.fillStyle = '#ff3d00';
                ctx.beginPath();
                ctx.arc(bRelX, bRelY, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw Player (Center gold arrow)
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(-player.yaw + Math.PI); // match orientation

        // View cone
        ctx.fillStyle = 'rgba(255, 235, 59, 0.18)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 36, -Math.PI / 4, Math.PI / 4);
        ctx.closePath();
        ctx.fill();

        // Player Triangle Icon
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 6);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();

        // Radar Outer Glowing Ring
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(center, center, center - 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    showHitmarker(isHeadshot = false) {
        if (!this.hitmarker) return;
        this.hitmarker.style.opacity = '1';
        this.hitmarker.style.transform = 'translate(-50%, -50%) scale(1.35)';
        this.hitmarker.style.borderColor = isHeadshot ? '#ff1744' : '#ffffff';

        setTimeout(() => {
            if (this.hitmarker) {
                this.hitmarker.style.opacity = '0';
                this.hitmarker.style.transform = 'translate(-50%, -50%) scale(1.0)';
            }
        }, 120);
    }

    showFloatingDamage(worldPos, amount, isHeadshot) {
        if (!this.damageContainer || !window.gameInstance || !window.gameInstance.camera) return;

        // Project 3D world coordinate to 2D screen coordinate
        const screenPos = worldPos.clone().project(window.gameInstance.camera);
        if (screenPos.z > 1) return; // Behind camera

        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

        const el = document.createElement('div');
        el.className = `damage-number ${isHeadshot ? 'headshot' : 'body'}`;
        el.textContent = isHeadshot ? `${amount} CRIT!` : `${amount}`;
        el.style.left = `${x + (Math.random() - 0.5) * 30}px`;
        el.style.top = `${y + (Math.random() - 0.5) * 20}px`;

        this.damageContainer.appendChild(el);

        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 900);
    }

    addFeedEntry(killer, victim, weapon, isHeadshot) {
        if (!this.killFeedContainer) return;
        const entry = document.createElement('div');
        entry.className = 'kill-feed-entry';

        const isPlayerKiller = killer === 'Player';
        const isPlayerVictim = victim === 'Player';

        entry.innerHTML = `
            <span class="${isPlayerKiller ? 'feed-player' : 'feed-bot'}">${killer}</span>
            <span class="feed-weapon">${isHeadshot ? '⚡' : ''} [${weapon}]</span>
            <span class="${isPlayerVictim ? 'feed-player' : 'feed-bot'}">${victim}</span>
        `;

        this.killFeedContainer.prepend(entry);

        // Keep at most 5 entries
        while (this.killFeedContainer.children.length > 5) {
            this.killFeedContainer.removeChild(this.killFeedContainer.lastChild);
        }

        setTimeout(() => {
            if (entry.parentNode) entry.parentNode.removeChild(entry);
        }, 6000);
    }

    flashDamageIndicator() {
        if (!this.damageVignette) return;
        this.damageVignette.style.opacity = '0.75';
        setTimeout(() => {
            if (this.damageVignette) {
                this.damageVignette.style.opacity = '0';
            }
        }, 250);
    }

    showDefeatScreen() {
        const defeatModal = document.getElementById('defeat-modal');
        if (defeatModal) {
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            defeatModal.style.display = 'flex';
            const stats = document.getElementById('defeat-stats');
            if (stats && window.gameInstance && window.gameInstance.player) {
                const p = window.gameInstance.player;
                stats.innerHTML = `
                    <p>KILLS: <strong style="color: #ffea00">${p.kills}</strong></p>
                    <p>DAMAGE: <strong style="color: #ff9100">${p.damageDealt}</strong></p>
                `;
            }
        }
    }

    showVictoryScreen() {
        const booyahModal = document.getElementById('booyah-modal');
        if (booyahModal) {
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            booyahModal.style.display = 'flex';
            window.Sound.playBooyah();
            const stats = document.getElementById('booyah-stats');
            if (stats && window.gameInstance && window.gameInstance.player) {
                const p = window.gameInstance.player;
                stats.innerHTML = `
                    <div class="stat-box"><span>RANK</span><strong>#1 / 10</strong></div>
                    <div class="stat-box"><span>KILLS</span><strong>${p.kills}</strong></div>
                    <div class="stat-box"><span>DAMAGE</span><strong>${p.damageDealt}</strong></div>
                    <div class="stat-box"><span>SURVIVED</span><strong>100%</strong></div>
                `;
            }
        }
    }
}

window.UIManager = UIManager;
