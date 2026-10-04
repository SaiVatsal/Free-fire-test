/**
 * Free Fire 4K - Web Audio Procedural Sound Synthesizer
 * High-impact battle royale sound effects without any external asset dependencies.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.8;
        this.isMuted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            this.ctx = new AudioContext();
            this.initialized = true;
        }
    }

    ensureContext() {
        if (!this.initialized) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    // Helper: create white noise buffer
    createNoiseBuffer(duration = 0.5) {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    /**
     * Play weapon firing sound
     * @param {'ak47'|'awm'|'mp40'} type
     */
    playGunshot(type = 'ak47') {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const master = this.ctx.createGain();
        master.gain.value = this.masterVolume;
        master.connect(this.ctx.destination);

        if (type === 'ak47') {
            // Heavy Assault Rifle punch + mechanical crack
            // 1. Sub-bass punch
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(160, t);
            osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);
            oscGain.gain.setValueAtTime(0.9, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
            osc.connect(oscGain);
            oscGain.connect(master);
            osc.start(t);
            osc.stop(t + 0.2);

            // 2. High-pressure blast noise
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.25);
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(1400, t);
            noiseFilter.frequency.exponentialRampToValueAtTime(300, t + 0.2);
            noiseFilter.Q.value = 1.2;

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(1.0, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(master);
            noise.start(t);
        } else if (type === 'awm') {
            // Massive booming sniper rifle blast with deep reverb tail
            // 1. Huge sub blast
            const sub = this.ctx.createOscillator();
            const subGain = this.ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(190, t);
            sub.frequency.exponentialRampToValueAtTime(25, t + 0.4);
            subGain.gain.setValueAtTime(1.2, t);
            subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            sub.connect(subGain);
            subGain.connect(master);
            sub.start(t);
            sub.stop(t + 0.5);

            // 2. Explosive supersonic crack
            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.7);
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(3500, t);
            filter.frequency.exponentialRampToValueAtTime(200, t + 0.6);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(1.3, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.005, t + 0.65);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(master);
            noise.start(t);

            // 3. Bolt action metallic cycle click after 0.4s
            setTimeout(() => {
                this.playMechanicalClick();
            }, 380);
        } else if (type === 'mp40') {
            // Rapid snappy SMG burst pop
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
            oscGain.gain.setValueAtTime(0.7, t);
            oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
            osc.connect(oscGain);
            oscGain.connect(master);
            osc.start(t);
            osc.stop(t + 0.1);

            const noise = this.ctx.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.12);
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1800;

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.8, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(master);
            noise.start(t);
        }
    }

    /**
     * Mechanical bolt/click sound
     */
    playMechanicalClick() {
        if (this.isMuted || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1800, t);
        osc.frequency.setValueAtTime(900, t + 0.04);
        gain.gain.setValueAtTime(0.3 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.09);
    }

    /**
     * Hit marker feedback (Classic Free Fire ding/thud)
     */
    playHitmarker(isHeadshot = false) {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (isHeadshot) {
            // High metallic ping for headshots!
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800, t);
            osc.frequency.setValueAtTime(2200, t + 0.03);
            gain.gain.setValueAtTime(0.8 * this.masterVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.25);
        } else {
            // Crisp tactical tick
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(950, t);
            osc.frequency.exponentialRampToValueAtTime(450, t + 0.07);
            gain.gain.setValueAtTime(0.55 * this.masterVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.09);
        }
    }

    /**
     * Reload sound sequence
     */
    playReload() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        // Mag eject
        const osc1 = this.ctx.createOscillator();
        const g1 = this.ctx.createGain();
        osc1.frequency.setValueAtTime(300, t);
        osc1.frequency.linearRampToValueAtTime(150, t + 0.1);
        g1.gain.setValueAtTime(0.4 * this.masterVolume, t);
        g1.gain.linearRampToValueAtTime(0.01, t + 0.12);
        osc1.connect(g1);
        g1.connect(this.ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.13);

        // Mag insert (after 0.6s)
        setTimeout(() => {
            if (!this.ctx) return;
            const t2 = this.ctx.currentTime;
            const osc2 = this.ctx.createOscillator();
            const g2 = this.ctx.createGain();
            osc2.frequency.setValueAtTime(400, t2);
            osc2.frequency.setValueAtTime(600, t2 + 0.06);
            g2.gain.setValueAtTime(0.5 * this.masterVolume, t2);
            g2.gain.linearRampToValueAtTime(0.01, t2 + 0.1);
            osc2.connect(g2);
            g2.connect(this.ctx.destination);
            osc2.start(t2);
            osc2.stop(t2 + 0.12);
        }, 500);

        // Slide rack (after 1.1s)
        setTimeout(() => {
            if (!this.ctx) return;
            const t3 = this.ctx.currentTime;
            const osc3 = this.ctx.createOscillator();
            const g3 = this.ctx.createGain();
            osc3.type = 'sawtooth';
            osc3.frequency.setValueAtTime(800, t3);
            osc3.frequency.exponentialRampToValueAtTime(200, t3 + 0.12);
            g3.gain.setValueAtTime(0.45 * this.masterVolume, t3);
            g3.gain.linearRampToValueAtTime(0.01, t3 + 0.15);
            osc3.connect(g3);
            g3.connect(this.ctx.destination);
            osc3.start(t3);
            osc3.stop(t3 + 0.16);
        }, 1000);
    }

    /**
     * Medkit healing chime
     */
    playHeal() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const notes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
        notes.forEach((freq, idx) => {
            const t = this.ctx.currentTime + idx * 0.12;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3 * this.masterVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.38);
        });
    }

    /**
     * Footstep sound
     */
    playFootstep() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.06);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 250 + Math.random() * 80;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18 * this.masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(t);
    }

    /**
     * Safe zone warning siren
     */
    playZoneWarning() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.linearRampToValueAtTime(660, t + 0.4);
        osc.frequency.linearRampToValueAtTime(440, t + 0.8);

        gain.gain.setValueAtTime(0.3 * this.masterVolume, t);
        gain.gain.linearRampToValueAtTime(0.35 * this.masterVolume, t + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.85);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.9);
    }

    /**
     * Grand "BOOYAH!" victory fanfare
     */
    playBooyah() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const chords = [
            { freqs: [261.63, 329.63, 392.00], delay: 0, dur: 0.35 },    // C major
            { freqs: [293.66, 369.99, 440.00], delay: 0.35, dur: 0.35 }, // D major
            { freqs: [329.63, 415.30, 493.88], delay: 0.7, dur: 0.4 },  // E major
            { freqs: [523.25, 659.25, 783.99, 1046.50], delay: 1.15, dur: 1.8 } // High C octave triumph!
        ];

        chords.forEach(chord => {
            const start = this.ctx.currentTime + chord.delay;
            chord.freqs.forEach(freq => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = freq;

                // Warm lowpass filter for brassy fanfare
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 1600;

                gain.gain.setValueAtTime(0.25 * this.masterVolume, start);
                gain.gain.exponentialRampToValueAtTime(0.005, start + chord.dur);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(start);
                osc.stop(start + chord.dur + 0.05);
            });
        });
    }

    /**
     * Player defeat sound
     */
    playDefeat() {
        if (this.isMuted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const freqs = [185, 146.83, 110]; // Low melancholy minor drop
        freqs.forEach((freq, idx) => {
            const start = t + idx * 0.3;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.4 * this.masterVolume, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.5);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.55);
        });
    }
}

// Global sound instance
window.Sound = new SoundEngine();
