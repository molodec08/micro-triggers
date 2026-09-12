import type { SoundSettings, TriggerContext } from "../types";

interface Note {
  freq: number;
  type: OscillatorType;
  duration: number;
  delay?: number;
}

const SOUND_PRESETS: Record<string, Note[]> = {
  beep: [{ freq: 880, type: "sine", duration: 0.15 }],
  bell: [
    { freq: 988, type: "sine", duration: 0.12 },
    { freq: 1319, type: "sine", duration: 0.2, delay: 0.08 },
  ],
  coin: [
    { freq: 988, type: "square", duration: 0.08 },
    { freq: 1319, type: "square", duration: 0.18, delay: 0.08 },
  ],
};

// ctx is unused here (sound alerts have no visual styling to apply) but kept
// in the signature to match every other trigger module's init(settings, ctx)
// contract, which core.ts calls uniformly.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function init(settings: SoundSettings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  let audioCtx: AudioContext | null = null;

  function playNote(note: Note, startDelay: number) {
    const oscillator = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    oscillator.type = note.type || "sine";
    oscillator.frequency.value = note.freq;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(audioCtx!.destination);
    const startTime = audioCtx!.currentTime + startDelay;
    oscillator.start(startTime);
    oscillator.stop(startTime + note.duration);
  }

  function playBeep() {
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = audioCtx || new AudioContextCtor();
      const notes = SOUND_PRESETS[settings.soundPreset] || SOUND_PRESETS.beep;
      for (const note of notes) {
        playNote(note, note.delay || 0);
      }
    } catch (e) {
      // Web Audio API недоступен (блокировщик приватности) — тихо игнорируем.
    }
  }

  if (settings.playOnAddCart) {
    document.addEventListener("submit", (event) => {
      const form = event.target as HTMLFormElement;
      if (form && form.action && form.action.indexOf("/cart/add") !== -1) {
        playBeep();
      }
    });
  }

  if (settings.playOnCheckout) {
    document.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest?.(
        '[href*="/checkout"]',
      );
      if (target) playBeep();
    });
  }
}
