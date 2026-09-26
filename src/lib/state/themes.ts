import type { ThemeId } from '$lib/types/tracker';

export interface ThemePreset { id: ThemeId; label: string; blurb: string; accent: string; dark: boolean }

/** Named looks modelled on palettes common across popular study platforms. */
export const THEME_PRESETS: ThemePreset[] = [
	{ id: 'light', label: 'Daylight', blurb: 'Clean neutral default', accent: '#6d5dfc', dark: false },
	{ id: 'dark', label: 'Midnight', blurb: 'Low-light night study', accent: '#8b7bff', dark: true },
	{ id: 'notion', label: 'Notion Paper', blurb: 'Warm minimal workspace', accent: '#2383e2', dark: false },
	{ id: 'duolingo', label: 'Duolingo', blurb: 'Bright playful green', accent: '#46a302', dark: false },
	{ id: 'anki', label: 'Anki', blurb: 'Crisp flashcard blue', accent: '#0072c6', dark: false },
	{ id: 'obsidian', label: 'Obsidian', blurb: 'Deep violet knowledge base', accent: '#8b7bff', dark: true },
	{ id: 'quizlet', label: 'Quizlet Navy', blurb: 'Cool dark study blue', accent: '#6b8afd', dark: true },
	{ id: 'green', label: 'Forest', blurb: 'Calm focus green', accent: '#2f9e6e', dark: true },
	{ id: 'red', label: 'Crimson', blurb: 'High-contrast night red', accent: '#e0455a', dark: true }
];

export const DARK_THEMES = new Set<ThemeId>(THEME_PRESETS.filter((t) => t.dark).map((t) => t.id));
export const isDarkTheme = (id: string) => DARK_THEMES.has(id as ThemeId);
export const presetOf = (id: string) => THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
