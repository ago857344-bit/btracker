import type { ThemeId } from '$lib/types/tracker';

export type SubjectKey = 'P' | 'C' | 'M';

/** Unlock requirement shared by themes and cosmetics. Elo-based reqs read all-time peaks, streak reads the live streak. */
export type Req =
	| { kind: 'elo'; min: number }
	| { kind: 'subject'; sub: SubjectKey; min: number }
	| { kind: 'streak'; min: number }
	| { kind: 'prestige'; min: number };

export type FxId = 'none' | 'pulse' | 'ember' | 'tide' | 'gilded' | 'flux' | 'reaction' | 'proof' | 'celestial';

export interface ThemePreset {
	id: ThemeId; label: string; blurb: string; accent: string; dark: boolean;
	unlock?: Req;
	/** Default accent animation when the cosmetics loadout leaves fx on "match theme". */
	fx?: FxId;
	/** Builtin exclusive background (CSS background-image value), applied when the theme is selected. */
	wallpaper?: string;
	confetti: string[];
}

const BUILTIN = 'builtin:';

export const isBuiltinWallpaper = (wp: string | null | undefined) => Boolean(wp && wp.startsWith(BUILTIN));

const STARS = [
	[8, 14], [17, 62], [26, 33], [34, 84], [43, 9], [52, 51], [61, 77], [69, 22], [77, 58], [86, 38], [93, 81], [12, 91], [48, 28], [72, 93]
].map(([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255, 255, 255, 0.75) 0 1px, transparent 2px)`).join(', ');

/** Builtin backgrounds that are not tied to a theme (equipped through the cosmetics loadout). */
export const EXTRA_WALLPAPERS: { id: string; label: string; css: string; unlock: Req }[] = [
	{
		id: 'celestial', label: 'Celestial', unlock: { kind: 'prestige', min: 1 },
		css: `${STARS}, radial-gradient(900px 620px at 18% 8%, rgba(177, 151, 252, 0.2) 0%, transparent 60%), radial-gradient(900px 620px at 88% 96%, rgba(0, 229, 255, 0.15) 0%, transparent 58%), linear-gradient(165deg, #05030f 0%, #120a2a 50%, #02010a 100%)`
	}
];

/** Resolve a stored wallpaper value to a CSS background-image value (builtin ids → preset gradient, URLs wrapped). */
export const wallpaperCss = (wp: string) => {
	if (wp.startsWith("data:video")) return "none";
	if (!wp.startsWith(BUILTIN)) return `url(${wp})`;
	const id = wp.slice(BUILTIN.length);
	const themeWp = THEME_PRESETS.find((t) => t.id === id)?.wallpaper ?? EXTRA_WALLPAPERS.find((w) => w.id === id)?.css ?? '';
	if (themeWp && themeWp.endsWith('.mp4')) return 'none';
	return themeWp;
};

/**
 * Sync the builtin wallpaper whenever the theme or loadout changes. User-set (non-builtin)
 * wallpapers always win; an equipped loadout wallpaper beats the theme's own.
 */
export const syncThemeWallpaper = (s: { theme: string; ui: { wallpaper?: string | null; cosmetics?: { wallpaper?: string } } }) => {
	if (s.ui.wallpaper && !isBuiltinWallpaper(s.ui.wallpaper)) return;
	const equipped = s.ui.cosmetics?.wallpaper;
	if (equipped) {
		s.ui.wallpaper = equipped === 'none' ? null : BUILTIN + equipped;
		return;
	}
	const preset = THEME_PRESETS.find((t) => t.id === s.theme);
	s.ui.wallpaper = preset?.wallpaper ? BUILTIN + s.theme : null;
};

/** Named looks modelled on palettes common across popular study platforms. */
export const THEME_PRESETS: ThemePreset[] = [
	{ id: 'light', label: 'Daylight', blurb: 'Clean neutral default', accent: '#6d5dfc', dark: false, confetti: ['#6d5dfc', '#d99a2b', '#ffffff'] },
	{ id: 'dark', label: 'Midnight', blurb: 'Low-light night study', accent: '#8b7bff', dark: true, confetti: ['#8b7bff', '#6d5dfc', '#ffffff'] },
	{ id: 'notion', label: 'Notion Paper', blurb: 'Warm minimal workspace', accent: '#2383e2', dark: false, confetti: ['#2383e2', '#8f979f', '#ffffff'] },
	{ id: 'duolingo', label: 'Duolingo', blurb: 'Bright playful green', accent: '#46a302', dark: false, confetti: ['#46a302', '#89e219', '#ffc800', '#ffffff'] },
	{ id: 'anki', label: 'Anki', blurb: 'Crisp flashcard blue', accent: '#0072c6', dark: false, confetti: ['#0072c6', '#3fa7e0', '#ffffff'] },
	{ id: 'obsidian', label: 'Obsidian', blurb: 'Deep violet knowledge base', accent: '#8b7bff', dark: true, confetti: ['#8b7bff', '#b44df0', '#ffffff'] },
	{ id: 'quizlet', label: 'Quizlet Navy', blurb: 'Cool dark study blue', accent: '#6b8afd', dark: true, confetti: ['#6b8afd', '#4255ff', '#ffffff'] },
	{ id: 'green', label: 'Forest', blurb: 'Calm focus green', accent: '#2f9e6e', dark: true, confetti: ['#2f9e6e', '#69db7c', '#ffffff'] },
	{ id: 'red', label: 'Crimson', blurb: 'High-contrast night red', accent: '#e0455a', dark: true, confetti: ['#e0455a', '#ff8787', '#ffffff'] },
	{
		id: 'aurora', label: 'Aurora Borealis', blurb: 'Northern lights over a quiet lake', accent: '#00e5ff', dark: true, fx: 'tide',
		wallpaper: '/videos/aurora borealis.mp4',
		confetti: ['#00e5ff', '#9b5de5', '#00f5d4', '#ffffff']
	},
	{
		id: 'initiate', label: 'Neon Initiate', blurb: 'Cryo-neon glow for your first climb', accent: '#00e5ff', dark: true,
		unlock: { kind: 'elo', min: 400 }, fx: 'pulse',
		wallpaper: '/videos/neon initiate.mp4',
		confetti: ['#00e5ff', '#00b8d4', '#8ff8ff', '#ffffff']
	},
	{
		id: 'master', label: 'Sapphire Master', blurb: 'Daylight sky sapphire focus', accent: '#0072c6', dark: false,
		unlock: { kind: 'elo', min: 1250 }, fx: 'tide',
		wallpaper: '/videos/sapphire master.mp4',
		confetti: ['#4dabf7', '#748ffc', '#a5d8ff', '#ffffff']
	},
	{
		id: 'god-mode', label: 'God Mode', blurb: 'Golden hour, all the time', accent: '#ffd700', dark: true,
		unlock: { kind: 'elo', min: 1600 }, fx: 'gilded',
		wallpaper: '/videos/god mode.mp4',
		confetti: ['#ffd700', '#ffb347', '#fff3b0', '#ffffff']
	},
	{
		id: 'catalyst', label: 'Catalyst Lab', blurb: 'Chemistry mastery — reactive lime glow', accent: '#a3e635', dark: true,
		unlock: { kind: 'subject', sub: 'C', min: 1000 }, fx: 'reaction',
		wallpaper: '/videos/catalyst lab.mp4',
		confetti: ['#a3e635', '#22c55e', '#facc15', '#ffffff']
	},
];

export const DARK_THEMES = new Set<ThemeId>(THEME_PRESETS.filter((t) => t.dark).map((t) => t.id));
export const isDarkTheme = (id: string) => DARK_THEMES.has(id as ThemeId);
export const presetOf = (id: string) => THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
