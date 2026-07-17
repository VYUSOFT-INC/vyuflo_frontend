// src/hooks/employee/useNotificationSoundSettings.ts
//
// Persists notification sound preferences in localStorage.
// Consumed by ProfileSecurity (settings UI) and SecureMessaging + NotificationsCenterV2 (playback).

import { useState, useEffect, useCallback } from "react";

export type SoundStyle = "ding" | "chime" | "pop" | "silent";

export interface NotificationSoundSettings {
  messageSound:      boolean;   // play sound on new message
  messageVolume:     number;    // 0–100
  messageSoundStyle: SoundStyle;
  notifSound:        boolean;   // play sound on new notification (bell)
  notifVolume:       number;    // 0–100
}

const STORAGE_KEY = "vf_notification_sound_settings";

const DEFAULTS: NotificationSoundSettings = {
  messageSound:      true,
  messageVolume:     70,
  messageSoundStyle: "ding",
  notifSound:        true,
  notifVolume:       50,
};

function load(): NotificationSoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(s: NotificationSoundSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    // Dispatch so other tabs/instances pick up the change
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch { /* silent */ }
}

// ── Exported hook ─────────────────────────────────────────────────────────────

export function useNotificationSoundSettings() {
  const [settings, setSettingsState] = useState<NotificationSoundSettings>(load);

  // Sync across tabs
  useEffect(() => {
    const h = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSettingsState(load());
    };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  const update = useCallback((patch: Partial<NotificationSoundSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  return { settings, update };
}

// ── Standalone getter (used in SecureMessaging + NotificationsCenterV2) ───────
// Call this inside playMessageSound() / playNotificationSound() to respect settings.

export function getSoundSettings(): NotificationSoundSettings {
  return load();
}

// ── Sound player ──────────────────────────────────────────────────────────────
// Single shared AudioContext

let _audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

type SoundType = "message" | "notif";

export function playSound(type: SoundType) {
  const s = getSoundSettings();

  if (type === "message" && !s.messageSound) return;
  if (type === "notif"   && !s.notifSound)   return;

  const style  = type === "message" ? s.messageSoundStyle : "chime";
  const volume = ((type === "message" ? s.messageVolume : s.notifVolume) / 100) * 0.4;

  const ctx = getAudioContext();
  if (!ctx || ctx.state === "suspended") return;

  try {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";

    const t = ctx.currentTime;

    switch (style) {
      case "ding":
        // Two-tone descending ding
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.setValueAtTime(900,  t + 0.08);
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t); osc.stop(t + 0.35);
        break;

      case "chime":
        // Soft ascending chime
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t); osc.stop(t + 0.5);
        break;

      case "pop":
        // Short pop
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t); osc.stop(t + 0.12);
        break;

      case "silent":
      default:
        return;
    }
  } catch { /* silent */ }
}