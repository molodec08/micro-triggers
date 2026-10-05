import { trackEvent } from "../shared";
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

export function init(settings: SoundSettings, ctx: TriggerContext) {
  if (!settings || !settings.enabled) return;

  let audioCtx: AudioContext | null = null;

  function getAudioContextCtor() {
    return (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    );
  }

  // Резюмирование AudioContext, созданного прямо в обработчике submit
  // (первый жест пользователя), слышно как "нарастающий" звук — устройство
  // вывода ещё физически не разогрето. Прогреваем контекст заранее, на
  // самом первом клике/тапе по странице (не обязательно связанном с
  // корзиной), чтобы к моменту playBeep() он уже был в состоянии "running".
  //
  // Разблокировать звук может только событие, которое браузер считает
  // пользовательской активацией: pointerdown — только для мыши, а для тача
  // это pointerup/touchend. Поэтому слушаем все такие события и снимаем
  // слушатели только когда контекст реально перешёл в "running" — иначе
  // первый тап на телефоне "сжигал" одноразовый слушатель впустую.
  const UNLOCK_EVENTS = ["pointerdown", "pointerup", "touchend", "keydown"];

  function removeWarmUpListeners() {
    for (const type of UNLOCK_EVENTS) {
      document.removeEventListener(type, warmUp, true);
    }
  }

  function warmUp() {
    try {
      const AudioContextCtor = getAudioContextCtor();
      audioCtx = audioCtx || new AudioContextCtor();
      if (audioCtx.state === "running") {
        removeWarmUpListeners();
      } else if (audioCtx.state === "suspended") {
        audioCtx
          .resume()
          .then(() => {
            if (audioCtx && audioCtx.state === "running") removeWarmUpListeners();
          })
          .catch(() => {});
      }
    } catch (e) {
      // Web Audio API недоступен — playBeep() позже тоже тихо проигнорирует.
      removeWarmUpListeners();
    }
  }
  for (const type of UNLOCK_EVENTS) {
    document.addEventListener(type, warmUp, { capture: true, passive: true });
  }

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
      const AudioContextCtor = getAudioContextCtor();
      audioCtx = audioCtx || new AudioContextCtor();
      const notes = SOUND_PRESETS[settings.soundPreset] || SOUND_PRESETS.beep;
      const start = () => {
        trackEvent(ctx.eventUrl, "sound", "impression");
        for (const note of notes) {
          playNote(note, note.delay || 0);
        }
      };
      // Браузеры создают новый AudioContext в состоянии "suspended" до тех
      // пор, пока он явно не разблокирован пользовательским жестом — при
      // первом добавлении в корзину resume() ещё не был вызван, поэтому
      // ноты планируются, но физически не звучат.
      if (audioCtx.state === "suspended") {
        audioCtx.resume().then(start);
      } else {
        start();
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
    // Переход на checkout выгружает страницу и обрывает звук на первых же
    // миллисекундах, а сама страница checkout — на стороне Shopify, наш
    // скрипт там не выполняется. Поэтому придерживаем переход ровно на
    // длительность пресета и затем продолжаем его сами.
    const notes = SOUND_PRESETS[settings.soundPreset] || SOUND_PRESETS.beep;
    const holdMs =
      Math.ceil(
        Math.max(...notes.map((n) => (n.delay || 0) + n.duration)) * 1000,
      ) + 50;
    let resuming = false;

    // Dawn и большинство тем: <button type="submit" name="checkout"> в форме
    // /cart (в т.ч. в cart drawer, через атрибут form="...") — Shopify
    // редиректит на checkout по имени кнопки.
    document.addEventListener("submit", (event) => {
      const submitter = (event as SubmitEvent).submitter as
        | HTMLButtonElement
        | HTMLInputElement
        | null;
      if (!submitter || submitter.name !== "checkout") return;
      // Повторная отправка ниже снова проходит через этот обработчик.
      if (resuming) return;
      // Тема/другое приложение уже остановило отправку (например, не
      // отмечено согласие с условиями) — не вмешиваемся.
      if (event.defaultPrevented) return;
      const form = event.target as HTMLFormElement;
      if (typeof form.requestSubmit !== "function") {
        // Без requestSubmit не воспроизвести отправку с name=checkout
        // корректно — играем звук без задержки, переход не трогаем.
        playBeep();
        return;
      }
      event.preventDefault();
      playBeep();
      window.setTimeout(() => {
        resuming = true;
        try {
          form.requestSubmit(submitter);
        } finally {
          resuming = false;
        }
      }, holdMs);
    });

    document.addEventListener("click", (event) => {
      if (event.defaultPrevented) return;
      const link = (event.target as HTMLElement).closest?.(
        'a[href*="/checkout"]',
      ) as HTMLAnchorElement | null;
      if (!link) return;
      // Открытие в новой вкладке/окне не выгружает текущую страницу —
      // звук доиграет сам, задерживать нечего.
      const opensElsewhere =
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0 ||
        (link.target && link.target !== "_self");
      playBeep();
      if (opensElsewhere) return;
      event.preventDefault();
      const href = link.href;
      window.setTimeout(() => {
        window.location.assign(href);
      }, holdMs);
    });
  }
}
