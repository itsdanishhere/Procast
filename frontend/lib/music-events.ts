export const focusMusicStateEvent = "procast:focus-music-state";
export const focusMusicCommandEvent = "procast:focus-music-command";
export const focusMusicOpenEvent = "procast:focus-music-open";

export type FocusMusicStateDetail = {
  available: boolean;
  playing: boolean;
  trackId: string | null;
  title: string | null;
};

export type FocusMusicCommandDetail = {
  action: "toggle" | "pause" | "resume" | "resume-or-start" | "stop";
};

export function emitFocusMusicState(detail: FocusMusicStateDetail) {
  window.dispatchEvent(new CustomEvent<FocusMusicStateDetail>(focusMusicStateEvent, { detail }));
}

export function emitFocusMusicCommand(detail: FocusMusicCommandDetail) {
  window.dispatchEvent(new CustomEvent<FocusMusicCommandDetail>(focusMusicCommandEvent, { detail }));
}

export function openFocusMusicPlayer() {
  window.dispatchEvent(new Event(focusMusicOpenEvent));
}
