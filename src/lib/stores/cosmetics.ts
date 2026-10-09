import { derived } from 'svelte/store';
import { buildUnlockCtx, resolveLoadout } from '$lib/state/cosmetics';
import { streakDays, tracker } from './tracker';

export const unlockCtx = derived([tracker, streakDays], ([$tracker, $streak]) => buildUnlockCtx($tracker, $streak));
export const loadout = derived([tracker, unlockCtx], ([$tracker, $ctx]) => resolveLoadout($tracker, $ctx));
