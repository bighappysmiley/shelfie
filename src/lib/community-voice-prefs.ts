const STORAGE_KEY = "shelfie:voice-prefs";

export type VoicePrefs = {
  muted: boolean;
  deafened: boolean;
};

const DEFAULT: VoicePrefs = { muted: false, deafened: false };

function read(): VoicePrefs {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<VoicePrefs>;
    return {
      muted: Boolean(parsed.muted),
      deafened: Boolean(parsed.deafened),
    };
  } catch {
    return DEFAULT;
  }
}

function write(prefs: VoicePrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function getVoicePrefs(): VoicePrefs {
  return read();
}

export function setVoiceMuted(muted: boolean): VoicePrefs {
  const next = { ...read(), muted };
  write(next);
  return next;
}

export function setVoiceDeafened(deafened: boolean): VoicePrefs {
  const next = { muted: deafened ? true : read().muted, deafened };
  write(next);
  return next;
}

export function toggleVoiceMuted(): VoicePrefs {
  const current = read();
  const next = { ...current, muted: !current.muted, deafened: current.deafened && current.muted };
  write(next);
  return next;
}

export function toggleVoiceDeafened(): VoicePrefs {
  const current = read();
  if (current.deafened) {
    const next = { muted: false, deafened: false };
    write(next);
    return next;
  }
  const next = { muted: true, deafened: true };
  write(next);
  return next;
}
