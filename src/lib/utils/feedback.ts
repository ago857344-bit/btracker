import { get } from 'svelte/store';
import { tracker } from '$lib/stores/tracker';
import { browser } from '$app/environment';

export function vibrate(pattern: number | number[]) {
    if (!browser || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) {}
}

export function vibrateLight() { vibrate(10); }
export function vibrateMedium() { vibrate(20); }
export function vibrateHeavy() { vibrate(30); }
export function vibrateSuccess() { vibrate([15, 50, 20]); }

// Simple oscillator beep for micro-UI sounds
let audioCtx: AudioContext | null = null;

function playOsc(freq: number, type: OscillatorType, duration: number, vol = 0.05) {
    if (!browser) return;
    const state = get(tracker);
    // Hardcoded enable for now, or tie to a new store preference
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, audioCtx.currentTime + duration);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

export function playTick() { playOsc(800, 'sine', 0.05, 0.03); }
export function playPop() { playOsc(400, 'sine', 0.08, 0.05); }
export function playSuccess() {
    playOsc(600, 'sine', 0.1, 0.05);
    setTimeout(() => playOsc(800, 'sine', 0.15, 0.05), 100);
}

export function uiClick() {
    const state = get(tracker);
    if ((state.ui as any).haptics !== false) vibrateLight();
    if ((state.ui as any).sounds !== false) playTick();
}

export function uiSuccess() {
    const state = get(tracker);
    if ((state.ui as any).haptics !== false) vibrateSuccess();
    if ((state.ui as any).sounds !== false) playSuccess();
}

export function uiPop() {
    const state = get(tracker);
    if ((state.ui as any).haptics !== false) vibrateMedium();
    if ((state.ui as any).sounds !== false) playPop();
}
