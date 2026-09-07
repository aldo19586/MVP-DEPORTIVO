// Sintetizador Web Audio API para sonidos del juego sin dependencias externas

class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Sonido de Match Encontrado (Fanfarria épica de emparejamiento)
  playMatchFound() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.01, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.45);
      });
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  // Silbato de Árbitro Profesional (Pitazo Final de Cancha - 3 ráfagas)
  playRefereeWhistle() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // 3 pitazos consecutivos característicos del final de un partido: corto, corto, largo
      const blasts = [
        { start: 0.0, duration: 0.25 },
        { start: 0.35, duration: 0.25 },
        { start: 0.70, duration: 0.75 }
      ];

      blasts.forEach(({ start, duration }) => {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Frecuencias ultrasónicas características de un silbato metálico deportivo (Fox 40)
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(2850, now + start);
        osc1.frequency.linearRampToValueAtTime(2900, now + start + duration);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(3100, now + start);
        osc2.frequency.linearRampToValueAtTime(3150, now + start + duration);

        gain.gain.setValueAtTime(0.01, now + start);
        gain.gain.linearRampToValueAtTime(0.5, now + start + 0.03);
        gain.gain.setValueAtTime(0.5, now + start + duration - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now + start);
        osc1.stop(now + start + duration);
        osc2.start(now + start);
        osc2.stop(now + start + duration);
      });

      // Vibración de alerta en celulares
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([300, 150, 300, 150, 700]);
      }
    } catch (e) {
      console.warn('Whistle error:', e);
    }
  }

  // Sonido de mensaje nuevo en el chat
  playMessage() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  // Sonido de clic / búsqueda iniciada
  playSearchStart() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }
}

export const soundFX = new SoundFX();

// Sistema de Notificaciones Web (Estilo PedidosYa en segundo plano)
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

export function showBackgroundNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=SportMatch',
        badge: 'https://api.dicebear.com/7.x/bottts/svg?seed=SportMatch',
        vibrate: [200, 100, 200],
        ...options
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('Error displaying native notification:', e);
    }
  }
}
