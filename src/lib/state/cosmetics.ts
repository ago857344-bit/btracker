import { tierEloOf } from './gamification';
import { EXTRA_WALLPAPERS, THEME_PRESETS, presetOf, type FxId, type Req } from './themes';
import type { CosmeticLoadout, TrackerState } from '$lib/types/tracker';

export interface UnlockCtx {
	/** All-time peak tier Elo. */
	tierElo: number;
	/** All-time peak skill Elo per subject. */
	subject: Record<string, number>;
	/** Live study streak in days. */
	streak: number;
	prestige: number; devMode: boolean;
}

const SUBJECT_NAMES: Record<string, string> = { P: 'Physics', C: 'Chemistry', M: 'Maths' };

export const reqValue = (req: Req, ctx: UnlockCtx) =>
	req.kind === 'elo' ? ctx.tierElo
	: req.kind === 'subject' ? ctx.subject[req.sub] ?? 0
	: req.kind === 'streak' ? ctx.streak
	: ctx.prestige;

export const reqMet = (req: Req | undefined, ctx: UnlockCtx) => !req || ctx.devMode || reqValue(req, ctx) >= req.min;
export const reqProgress = (req: Req, ctx: UnlockCtx) => Math.max(0, Math.min(1, reqValue(req, ctx) / req.min));

export const reqLabel = (req: Req) =>
	req.kind === 'elo' ? `${req.min}+ avg Elo`
	: req.kind === 'subject' ? `${req.min}+ ${SUBJECT_NAMES[req.sub]} Elo`
	: req.kind === 'streak' ? `${req.min}-day streak`
	: `Prestige ${'★'.repeat(req.min)}`;

export const reqStatus = (req: Req, ctx: UnlockCtx) => {
	const value = Math.round(reqValue(req, ctx));
	return req.kind === 'streak' ? `${value} / ${req.min} days`
		: req.kind === 'prestige' ? `${value} / ${req.min} ascension${req.min > 1 ? 's' : ''}`
		: `${value} / ${req.min} Elo`;
};

export type Slot = 'fx' | 'wallpaper' | 'confetti' | 'timer' | 'frame' | 'title';

export interface CosmeticItem {
	id: string;
	label: string;
	unlock?: Req;
	/** CSS background used for the picker chip. */
	swatch: string;
	colors?: string[];
	text?: string;
}

const grad = (colors: string[]) => `linear-gradient(135deg, ${colors.join(', ')})`;
const PRISM = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc', '#f783ac'];
const FLAME = ['#ffd43b', '#ff6b00', '#e03131'];
const elo = (min: number): Req => ({ kind: 'elo', min });
const sub = (s: 'P' | 'C' | 'M', min = 1000): Req => ({ kind: 'subject', sub: s, min });
const streak = (min: number): Req => ({ kind: 'streak', min });
const prestige = (min: number): Req => ({ kind: 'prestige', min });

const FX: CosmeticItem[] = [
	{ id: 'none', label: 'Still', swatch: 'var(--surface-subtle)' },
	{ id: 'pulse', label: 'Neon Pulse', unlock: elo(400), swatch: grad(['#00e5ff', '#00838f']) },
	{ id: 'ember', label: 'Ember Flicker', unlock: elo(900), swatch: grad(['#ffb347', '#ff4500', '#8b0000']) },
	{ id: 'tide', label: 'Sapphire Tide', unlock: elo(1250), swatch: grad(['#a5d8ff', '#4dabf7', '#1864ab']) },
	{ id: 'gilded', label: 'Gilded Shimmer', unlock: elo(1600), swatch: grad(['#ccac00', '#fff3b0', '#ffd700']) },
	{ id: 'flux', label: 'Field Flux', unlock: sub('P'), swatch: grad(['#4da3ff', '#7c8cff', '#b197fc']) },
	{ id: 'reaction', label: 'Chain Reaction', unlock: sub('C'), swatch: grad(['#facc15', '#a3e635', '#22c55e']) },
	{ id: 'proof', label: 'Marching Proof', unlock: sub('M'), swatch: grad(['#ffd8e4', '#ff5c8a', '#c2255c']) },
	{ id: 'celestial', label: 'Celestial Prism', unlock: prestige(1), swatch: grad(PRISM) }
];

const WALLPAPERS: CosmeticItem[] = [
	{ id: 'none', label: 'Plain', swatch: 'var(--surface-subtle)' },
	...THEME_PRESETS.filter((t) => t.wallpaper).map((t) => ({ id: t.id, label: t.label, unlock: t.unlock, swatch: t.wallpaper! })),
	...EXTRA_WALLPAPERS.map((w) => ({ id: w.id, label: w.label, unlock: w.unlock, swatch: w.css }))
];

const CONFETTI: CosmeticItem[] = [
	...THEME_PRESETS.filter((t) => t.unlock).map((t) => ({ id: t.id, label: t.label, unlock: t.unlock, colors: t.confetti, swatch: grad(t.confetti.slice(0, 3)) })),
	{ id: 'prismatic', label: 'Prismatic', unlock: prestige(1), colors: PRISM, swatch: grad(PRISM) }
];

const TIMERS: CosmeticItem[] = [
	{ id: 'classic', label: 'Classic', swatch: 'var(--accent)' },
	{ id: 'neon', label: 'Neon Tube', unlock: elo(400), swatch: grad(['#00e5ff', '#8ff8ff']) },
	{ id: 'segmented', label: 'Segmented', unlock: elo(900), swatch: 'repeating-linear-gradient(90deg, #ff4500 0 6px, transparent 6px 9px)' },
	{ id: 'sweep', label: 'Sapphire Sweep', unlock: elo(1250), swatch: grad(['#a5d8ff', '#4dabf7', '#1864ab']) },
	{ id: 'gilded', label: 'Gilded', unlock: elo(1600), swatch: grad(['#fff3b0', '#ffd700', '#b8860b']) },
	{ id: 'blaze', label: 'Blaze', unlock: streak(21), swatch: grad(FLAME) },
	{ id: 'orbit', label: 'Orbit', unlock: prestige(1), swatch: grad(PRISM) }
];

const FRAMES: CosmeticItem[] = [
	{ id: 'none', label: 'None', swatch: 'var(--surface-subtle)' },
	{ id: 'neon', label: 'Neon', unlock: elo(400), colors: ['#00e5ff', '#00838f'] , swatch: grad(['#00e5ff', '#00838f']) },
	{ id: 'ember', label: 'Ember', unlock: elo(900), colors: ['#ffb347', '#ff4500', '#8b0000'], swatch: grad(['#ffb347', '#ff4500', '#8b0000']) },
	{ id: 'sapphire', label: 'Sapphire', unlock: elo(1250), colors: ['#a5d8ff', '#4dabf7', '#1864ab'], swatch: grad(['#a5d8ff', '#4dabf7', '#1864ab']) },
	{ id: 'gold', label: 'Gold', unlock: elo(1600), colors: ['#fff3b0', '#ffd700', '#b8860b'], swatch: grad(['#fff3b0', '#ffd700', '#b8860b']) },
	{ id: 'flame', label: 'Flame', unlock: streak(14), colors: FLAME, swatch: grad(FLAME) },
	{ id: 'celestial', label: 'Celestial', unlock: prestige(1), colors: PRISM, swatch: grad(PRISM) }
];

const TITLES: CosmeticItem[] = [
	{ id: 'level', label: 'Level title', swatch: 'var(--surface-subtle)' },
	{ id: 'rising', label: 'Rising Star', text: 'Rising Star', unlock: elo(400), swatch: grad(['#00e5ff', '#00838f']) },
	{ id: 'challenger', label: 'Challenger', text: 'Challenger', unlock: elo(900), swatch: grad(['#ff4500', '#8b0000']) },
	{ id: 'grandmaster', label: 'Grandmaster', text: 'Grandmaster', unlock: elo(1600), swatch: grad(['#ffd700', '#b8860b']) },
	{ id: 'quantum', label: 'Quantum Mind', text: 'Quantum Mind', unlock: sub('P'), swatch: grad(['#4da3ff', '#7c8cff']) },
	{ id: 'chemist', label: 'Mad Chemist', text: 'Mad Chemist', unlock: sub('C'), swatch: grad(['#a3e635', '#22c55e']) },
	{ id: 'proof', label: 'Proof Machine', text: 'Proof Machine', unlock: sub('M'), swatch: grad(['#ff5c8a', '#c2255c']) },
	{ id: 'unbroken', label: 'Unbroken', text: 'Unbroken', unlock: streak(30), swatch: grad(FLAME) },
	{ id: 'ascended', label: 'Ascended', text: 'Ascended', unlock: prestige(1), swatch: grad(PRISM) },
	{ id: 'eternal', label: 'Eternal', text: 'Eternal', unlock: prestige(3), swatch: grad(['#ffffff', '#b197fc', '#4dabf7']) }
];

export const COSMETIC_SLOTS: { slot: Slot; label: string; hint: string; items: CosmeticItem[] }[] = [
	{ slot: 'fx', label: 'Accent animation', hint: 'Glow on the logo, active nav and New task button', items: FX },
	{ slot: 'wallpaper', label: 'Wallpaper', hint: 'Builtin backgrounds — your own uploads still win', items: WALLPAPERS },
	{ slot: 'confetti', label: 'Confetti', hint: 'Colours for level-ups and unlocks', items: CONFETTI },
	{ slot: 'timer', label: 'Focus timer skin', hint: 'Style of the focus dial', items: TIMERS },
	{ slot: 'frame', label: 'Profile frame', hint: 'Border on your sidebar card and share card', items: FRAMES },
	{ slot: 'title', label: 'Title', hint: 'Shown under your name', items: TITLES }
];

export const AURORA_REQ: Req = streak(7);

export const itemsOf = (slot: Slot) => COSMETIC_SLOTS.find((s) => s.slot === slot)!.items;
export const itemOf = (slot: Slot, id: string | undefined) => (id ? itemsOf(slot).find((item) => item.id === id) : undefined);

export function buildUnlockCtx(state: TrackerState, streakDays: number): UnlockCtx {
	const g = state.gamification;
	const subject: Record<string, number> = {};
	for (const code of ['P', 'C', 'M']) {
		subject[code] = Math.max(g?.peak?.subject[code] ?? 0, Math.round((g?.elo as Record<string, number> | undefined)?.[code] ?? 0));
	}
	return {
		tierElo: Math.max(g?.peak?.tierElo ?? 0, Math.round(tierEloOf(g))),
		subject,
		streak: streakDays,
		prestige: g?.prestige?.count ?? 0,
		devMode: !!state.ui.devMode
	};
}

export interface ResolvedLoadout {
	fx: FxId;
	confetti: string[];
	timer: string;
	frame: CosmeticItem | null;
	title: string | null;
	aurora: boolean;
	prestige: number;
}

/** Turn the equipped loadout into what to render, dropping anything no longer unlocked (e.g. a broken streak). */
export function resolveLoadout(state: TrackerState, ctx: UnlockCtx): ResolvedLoadout {
	const equipped: CosmeticLoadout = state.ui.cosmetics ?? {};
	const theme = presetOf(state.theme);
	const pick = (slot: Slot) => {
		const item = itemOf(slot, equipped[slot]);
		return item && reqMet(item.unlock, ctx) ? item : undefined;
	};
	const frame = pick('frame');
	return {
		fx: (pick('fx')?.id as FxId | undefined) ?? theme.fx ?? 'none',
		confetti: pick('confetti')?.colors ?? theme.confetti,
		timer: pick('timer')?.id ?? 'classic',
		frame: frame && frame.id !== 'none' ? frame : null,
		title: pick('title')?.text ?? null,
		aurora: equipped.aurora !== false && reqMet(AURORA_REQ, ctx),
		prestige: ctx.prestige
	};
}

export interface Unlockable {
	key: string;
	kind: 'theme' | Slot | 'aurora';
	id: string;
	label: string;
	kindLabel: string;
	unlock: Req;
	swatch: string;
	accent: string;
}

/** Everything with an unlock requirement, used by the unlock ceremony. */
export function allUnlockables(): Unlockable[] {
	const out: Unlockable[] = THEME_PRESETS.filter((t) => t.unlock).map((t) => ({
		key: `theme:${t.id}`, kind: 'theme', id: t.id, label: t.label, kindLabel: 'Theme', unlock: t.unlock!, swatch: t.wallpaper ?? t.accent, accent: t.accent
	}));
	for (const { slot, label, items } of COSMETIC_SLOTS) {
		// Theme-derived wallpapers/confetti arrive with their theme; listing them again is noise.
		if (slot === 'wallpaper' || slot === 'confetti') {
			items.filter((item) => item.unlock && !THEME_PRESETS.some((t) => t.id === item.id)).forEach((item) => out.push(toUnlockable(slot, label, item)));
			continue;
		}
		items.filter((item) => item.unlock).forEach((item) => out.push(toUnlockable(slot, label, item)));
	}
	out.push({ key: 'aurora:aurora', kind: 'aurora', id: 'aurora', label: 'Aurora Backdrop', kindLabel: 'Live effect', unlock: AURORA_REQ, swatch: grad(['#69db7c', '#4dabf7', '#b197fc']), accent: '#69db7c' });
	return out;
}

const toUnlockable = (slot: Slot, slotLabel: string, item: CosmeticItem): Unlockable => ({
	key: `${slot}:${item.id}`, kind: slot, id: item.id, label: item.label, kindLabel: slotLabel, unlock: item.unlock!, swatch: item.swatch,
	accent: item.colors?.[1] ?? item.colors?.[0] ?? '#b197fc'
});
