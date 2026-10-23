/**
 * Adaptive Wallpaper Luminance & Color Analyzer
 * Samples the active wallpaper (image or video) using an offscreen canvas
 * to calculate perceived relative luminance (ITU-R BT.709) and extract the
 * bottom color and vibrant accents.
 * Dynamically adjusts document attributes, meta theme-color, and CSS variables so
 * navigation bars and UI elements seamlessly match the custom wallpaper.
 */

import { writable } from 'svelte/store';

export interface LuminanceResult {
	luminance: number; // 0 (pure black) to 1 (pure white)
	isBright: boolean;
	scrimOpacity: number;
	bottomColor: string; // "rgb(r, g, b)"
	bottomHex: string; // "#rrggbb"
	bottomLuminance: number;
	isBottomBright: boolean;
	accentColor: string; // "#rrggbb"
	bottomAccent: string; // "#rrggbb"
}

export interface ActiveWallpaperState {
	bottomHex: string | null;
	bottomColor: string | null;
	accentColor: string | null;
	bottomAccent: string | null;
	isBottomBright: boolean;
	luminance: number;
	isBright: boolean;
}

export const activeWallpaperColors = writable<ActiveWallpaperState>({
	bottomHex: null,
	bottomColor: null,
	accentColor: null,
	bottomAccent: null,
	isBottomBright: false,
	luminance: 0.2,
	isBright: false
});

const CACHE = new Map<string, LuminanceResult>();

export const PRESET_WALLPAPER_COLORS: Record<string, LuminanceResult> = {
	aurora: {
		luminance: 0.12,
		isBright: false,
		scrimOpacity: 0.15,
		bottomColor: 'rgb(4, 8, 16)',
		bottomHex: '#040810',
		bottomLuminance: 0.03,
		isBottomBright: false,
		accentColor: '#00e5ff',
		bottomAccent: '#00e5ff'
	},
	initiate: {
		luminance: 0.10,
		isBright: false,
		scrimOpacity: 0.15,
		bottomColor: 'rgb(3, 5, 8)',
		bottomHex: '#030508',
		bottomLuminance: 0.02,
		isBottomBright: false,
		accentColor: '#00e5ff',
		bottomAccent: '#00e5ff'
	},
	master: {
		luminance: 0.88,
		isBright: true,
		scrimOpacity: 0.45,
		bottomColor: 'rgb(230, 242, 255)',
		bottomHex: '#e6f2ff',
		bottomLuminance: 0.89,
		isBottomBright: true,
		accentColor: '#0072c6',
		bottomAccent: '#0072c6'
	},
	'god-mode': {
		luminance: 0.08,
		isBright: false,
		scrimOpacity: 0.15,
		bottomColor: 'rgb(3, 2, 0)',
		bottomHex: '#030200',
		bottomLuminance: 0.015,
		isBottomBright: false,
		accentColor: '#ffd700',
		bottomAccent: '#ffd700'
	},
	catalyst: {
		luminance: 0.09,
		isBright: false,
		scrimOpacity: 0.15,
		bottomColor: 'rgb(2, 5, 3)',
		bottomHex: '#020503',
		bottomLuminance: 0.02,
		isBottomBright: false,
		accentColor: '#a3e635',
		bottomAccent: '#a3e635'
	},
	celestial: {
		luminance: 0.06,
		isBright: false,
		scrimOpacity: 0.15,
		bottomColor: 'rgb(2, 1, 10)',
		bottomHex: '#02010a',
		bottomLuminance: 0.015,
		isBottomBright: false,
		accentColor: '#b197fc',
		bottomAccent: '#b197fc'
	}
};

function rgbToHex(r: number, g: number, b: number): string {
	const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
	return `#${h(r)}${h(g)}${h(b)}`;
}

export function processCanvasPixels(data: Uint8ClampedArray, width: number, height: number): LuminanceResult {
	let totalLuminance = 0;
	let totalR = 0;
	let totalG = 0;
	let totalB = 0;
	const pixelCount = data.length / 4;

	// Bottom 30% area where the bottom nav sits on mobile
	const bottomRowStart = Math.floor(height * 0.70);
	let bottomR = 0;
	let bottomG = 0;
	let bottomB = 0;
	let bottomCount = 0;
	let bottomLuminanceSum = 0;

	// Track most vibrant pixel overall and in the bottom region
	let bestGlobalVibrancy = -1;
	let bestGlobalAccent = { r: 109, g: 93, b: 252 };

	let bestBottomVibrancy = -1;
	let bestBottomAccent = { r: 109, g: 93, b: 252 };

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const pixelIdx = i / 4;
		const y = Math.floor(pixelIdx / width);

		const rn = r / 255;
		const gn = g / 255;
		const bn = b / 255;
		const lum = 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;

		totalLuminance += lum;
		totalR += r;
		totalG += g;
		totalB += b;

		// HSL calculation for vibrancy scoring
		const max = Math.max(rn, gn, bn);
		const min = Math.min(rn, gn, bn);
		const l = (max + min) / 2;
		const d = max - min;
		const s = d === 0 ? 0 : (l > 0.5 ? d / (2 - max - min) : d / (max + min));

		// High saturation and mid lightness yields luminous accents
		const vibrancyScore = s * (1 - Math.abs(l - 0.52) * 1.5);

		if (s > 0.22 && l >= 0.22 && l <= 0.88 && vibrancyScore > bestGlobalVibrancy) {
			bestGlobalVibrancy = vibrancyScore;
			bestGlobalAccent = { r, g, b };
		}

		if (y >= bottomRowStart) {
			bottomR += r;
			bottomG += g;
			bottomB += b;
			bottomLuminanceSum += lum;
			bottomCount++;

			if (s > 0.18 && l >= 0.20 && l <= 0.90 && vibrancyScore > bestBottomVibrancy) {
				bestBottomVibrancy = vibrancyScore;
				bestBottomAccent = { r, g, b };
			}
		}
	}

	const avgLuminance = totalLuminance / (pixelCount || 1);
	const isBright = avgLuminance > 0.44;
	const scrimOpacity = isBright
		? Math.min(0.55, 0.32 + (avgLuminance - 0.44) * 0.45)
		: 0.2;

	const bCount = bottomCount || 1;
	const avgBottomR = Math.round(bottomR / bCount);
	const avgBottomG = Math.round(bottomG / bCount);
	const avgBottomB = Math.round(bottomB / bCount);
	const bottomLuminance = bottomLuminanceSum / bCount;
	const isBottomBright = bottomLuminance > 0.44;

	// Fallback for accents when image is largely monochromatic or muted
	if (bestBottomVibrancy < 0.08) {
		if (bestGlobalVibrancy >= 0.08) {
			bestBottomAccent = bestGlobalAccent;
		} else if (isBottomBright) {
			bestBottomAccent = {
				r: Math.round(avgBottomR * 0.45),
				g: Math.round(avgBottomG * 0.45),
				b: Math.round(avgBottomB * 0.55)
			};
		} else {
			bestBottomAccent = {
				r: Math.min(255, Math.round(avgBottomR * 1.5 + 48)),
				g: Math.min(255, Math.round(avgBottomG * 1.5 + 48)),
				b: Math.min(255, Math.round(avgBottomB * 1.6 + 64))
			};
		}
	}

	if (bestGlobalVibrancy < 0.08) {
		bestGlobalAccent = bestBottomAccent;
	}

	const bottomHex = rgbToHex(avgBottomR, avgBottomG, avgBottomB);
	const bottomColor = `rgb(${avgBottomR}, ${avgBottomG}, ${avgBottomB})`;
	const accentColor = rgbToHex(bestGlobalAccent.r, bestGlobalAccent.g, bestGlobalAccent.b);
	const bottomAccent = rgbToHex(bestBottomAccent.r, bestBottomAccent.g, bestBottomAccent.b);

	return {
		luminance: Number(avgLuminance.toFixed(3)),
		isBright,
		scrimOpacity: Number(scrimOpacity.toFixed(2)),
		bottomColor,
		bottomHex,
		bottomLuminance: Number(bottomLuminance.toFixed(3)),
		isBottomBright,
		accentColor,
		bottomAccent
	};
}

export function applyLuminanceToDom(result: LuminanceResult) {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	root.setAttribute('data-wallpaper-luminance', result.isBright ? 'bright' : 'dark');
	root.setAttribute('data-wallpaper-bottom-bright', result.isBottomBright ? 'true' : 'false');
	root.style.setProperty('--wallpaper-adaptive-scrim', `rgba(0, 0, 0, ${result.scrimOpacity})`);
	root.style.setProperty('--wallpaper-luminance', String(result.luminance));
	root.style.setProperty('--wallpaper-bottom-color', result.bottomColor);
	root.style.setProperty('--wallpaper-bottom-hex', result.bottomHex);
	root.style.setProperty('--wallpaper-accent', result.accentColor);
	root.style.setProperty('--wallpaper-bottom-accent', result.bottomAccent);
	root.style.setProperty('--wallpaper-bottom-luminance', String(result.bottomLuminance));

	// Immediately synchronize browser theme-color meta tag for phone status/navigation bars
	const metaThemeTags = document.querySelectorAll('meta[name="theme-color"]');
	metaThemeTags.forEach((tag) => tag.setAttribute('content', result.bottomHex));

	activeWallpaperColors.set({
		bottomHex: result.bottomHex,
		bottomColor: result.bottomColor,
		accentColor: result.accentColor,
		bottomAccent: result.bottomAccent,
		isBottomBright: result.isBottomBright,
		luminance: result.luminance,
		isBright: result.isBright
	});
}

export function clearWallpaperContrast() {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	root.removeAttribute('data-wallpaper-luminance');
	root.removeAttribute('data-wallpaper-bottom-bright');
	root.style.removeProperty('--wallpaper-adaptive-scrim');
	root.style.removeProperty('--wallpaper-luminance');
	root.style.removeProperty('--wallpaper-bottom-color');
	root.style.removeProperty('--wallpaper-bottom-hex');
	root.style.removeProperty('--wallpaper-accent');
	root.style.removeProperty('--wallpaper-bottom-accent');
	root.style.removeProperty('--wallpaper-bottom-luminance');

	activeWallpaperColors.set({
		bottomHex: null,
		bottomColor: null,
		accentColor: null,
		bottomAccent: null,
		isBottomBright: false,
		luminance: 0.2,
		isBright: false
	});
}

export async function analyzeWallpaperLuminance(sourceUrl: string | null): Promise<LuminanceResult> {
	if (!sourceUrl || typeof window === 'undefined') {
		const fallback: LuminanceResult = {
			luminance: 0.1,
			isBright: false,
			scrimOpacity: 0.15,
			bottomColor: 'rgb(18, 16, 32)',
			bottomHex: '#121020',
			bottomLuminance: 0.08,
			isBottomBright: false,
			accentColor: '#8b7bff',
			bottomAccent: '#8b7bff'
		};
		return fallback;
	}

	if (sourceUrl.startsWith('builtin:')) {
		const id = sourceUrl.slice(8);
		const preset = PRESET_WALLPAPER_COLORS[id] ?? {
			luminance: 0.15,
			isBright: false,
			scrimOpacity: 0.2,
			bottomColor: 'rgb(18, 16, 32)',
			bottomHex: '#121020',
			bottomLuminance: 0.08,
			isBottomBright: false,
			accentColor: '#8b7bff',
			bottomAccent: '#8b7bff'
		};
		CACHE.set(sourceUrl, preset);
		applyLuminanceToDom(preset);
		return preset;
	}

	if (CACHE.has(sourceUrl)) {
		const cached = CACHE.get(sourceUrl)!;
		applyLuminanceToDom(cached);
		return cached;
	}

	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';

		const fallback: LuminanceResult = {
			luminance: 0.25,
			isBright: false,
			scrimOpacity: 0.25,
			bottomColor: 'rgb(18, 16, 32)',
			bottomHex: '#121020',
			bottomLuminance: 0.08,
			isBottomBright: false,
			accentColor: '#8b7bff',
			bottomAccent: '#8b7bff'
		};

		let resolved = false;
		const done = (res: LuminanceResult) => {
			if (resolved) return;
			resolved = true;
			CACHE.set(sourceUrl, res);
			applyLuminanceToDom(res);
			resolve(res);
		};

		const timer = setTimeout(() => {
			done(fallback);
		}, 2000);

		img.onload = () => {
			clearTimeout(timer);
			try {
				const canvas = document.createElement('canvas');
				canvas.width = 32;
				canvas.height = 32;
				const ctx = canvas.getContext('2d', { willReadFrequently: true });
				if (!ctx) throw new Error('No 2d context');

				ctx.drawImage(img, 0, 0, 32, 32);
				const data = ctx.getImageData(0, 0, 32, 32).data;
				const result = processCanvasPixels(data, 32, 32);
				done(result);
			} catch {
				done(fallback);
			}
		};

		let retriedWithProxy = false;
		img.onerror = () => {
			if (!retriedWithProxy && !sourceUrl.startsWith('data:') && !sourceUrl.startsWith('blob:') && !sourceUrl.includes('wsrv.nl')) {
				retriedWithProxy = true;
				img.src = `https://wsrv.nl/?url=${encodeURIComponent(sourceUrl)}&output=jpg&w=64&h=64&fit=cover`;
				return;
			}
			clearTimeout(timer);
			done(fallback);
		};

		img.src = sourceUrl;
	});
}

export function sampleVideoFrame(videoEl: HTMLVideoElement): LuminanceResult {
	const fallback: LuminanceResult = {
		luminance: 0.2,
		isBright: false,
		scrimOpacity: 0.2,
		bottomColor: 'rgb(18, 16, 32)',
		bottomHex: '#121020',
		bottomLuminance: 0.08,
		isBottomBright: false,
		accentColor: '#8b7bff',
		bottomAccent: '#8b7bff'
	};

	if (!videoEl || typeof window === 'undefined' || videoEl.videoWidth === 0) {
		return fallback;
	}

	try {
		const canvas = document.createElement('canvas');
		canvas.width = 32;
		canvas.height = 32;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return fallback;

		ctx.drawImage(videoEl, 0, 0, 32, 32);
		const data = ctx.getImageData(0, 0, 32, 32).data;
		const result = processCanvasPixels(data, 32, 32);

		applyLuminanceToDom(result);
		return result;
	} catch {
		return fallback;
	}
}
