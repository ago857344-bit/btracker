import { writable } from 'svelte/store';

export const globalTimer = writable({
    running: false,
    remaining: 0,
    elapsed: 0,
    tab: 'focus',
    phase: 'focus',
    toggle: () => {},
    start: (subject: string, seconds: number, chapter: string, mode?: 'timer' | 'stopwatch') => {}
});
