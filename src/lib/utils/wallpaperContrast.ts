/**
 * Adaptive Wallpaper Luminance & Contrast Analyzer
 * Samples the active wallpaper (image or video) using an offscreen canvas
 * to calculate perceived relative luminance (ITU-R BT.709).
 * Dynamically adjusts document attributes and CSS variables so text and panels
 * remain 100% legible regardless of background brightness.
 */

export interface LuminanceResult {
	luminance: number; // 0 (pure black) to 1 (pure white)
	isBright: boolean;
	scrimOpacity: number;
}

const CACHE = new Map<string, LuminanceResult>();

export async function analyzeWallpaperLuminance(sourceUrl: string | null): Promise<LuminanceResult> {
	if (!sourceUrl || typeof window === 'undefined') {
		return { luminance: 0.1, isBright: false, scrimOpacity: 0.15 };
	}

	if (CACHE.has(sourceUrl)) {
		return CACHE.get(sourceUrl)!;
	}

	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';

		const timer = setTimeout(() => {
			// Fallback if image fails to load or cross-origin blocks canvas read
			const fallback: LuminanceResult = { luminance: 0.2, isBright: false, scrimOpacity: 0.25 };
			CACHE.set(sourceUrl, fallback);
			applyLuminanceToDom(fallback);
			resolve(fallback);
		}, 1500);

		img.onload = () => {
			clearTimeout(timer);
			try {
				const canvas = document.createElement('canvas');
				canvas.width = 16;
				canvas.height = 16;
				const ctx = canvas.getContext('2d', { willReadFrequently: true });
				if (!ctx) throw new Error('No 2d context');

				ctx.drawImage(img, 0, 0, 16, 16);
				const data = ctx.getImageData(0, 0, 16, 16).data;

				let totalLuminance = 0;
				const pixelCount = data.length / 4;

				for (let i = 0; i < data.length; i += 4) {
					const r = data[i] / 255;
					const g = data[i + 1] / 255;
					const b = data[i + 2] / 255;
					// ITU-R BT.709 perceived luminance
					totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
				}

				const avgLuminance = totalLuminance / pixelCount;
				const isBright = avgLuminance > 0.44;
				const scrimOpacity = isBright
					? Math.min(0.55, 0.32 + (avgLuminance - 0.44) * 0.45)
					: 0.2;

				const result: LuminanceResult = {
					luminance: Number(avgLuminance.toFixed(3)),
					isBright,
					scrimOpacity: Number(scrimOpacity.toFixed(2))
				};

				CACHE.set(sourceUrl, result);
				applyLuminanceToDom(result);
				resolve(result);
			} catch {
				const fallback: LuminanceResult = { luminance: 0.25, isBright: false, scrimOpacity: 0.25 };
				CACHE.set(sourceUrl, fallback);
				applyLuminanceToDom(fallback);
				resolve(fallback);
			}
		};

		img.onerror = () => {
			clearTimeout(timer);
			const fallback: LuminanceResult = { luminance: 0.25, isBright: false, scrimOpacity: 0.25 };
			CACHE.set(sourceUrl, fallback);
			applyLuminanceToDom(fallback);
			resolve(fallback);
		};

		img.src = sourceUrl;
	});
}

export function sampleVideoFrame(videoEl: HTMLVideoElement): LuminanceResult {
	if (!videoEl || typeof window === 'undefined' || videoEl.videoWidth === 0) {
		return { luminance: 0.2, isBright: false, scrimOpacity: 0.2 };
	}

	try {
		const canvas = document.createElement('canvas');
		canvas.width = 16;
		canvas.height = 16;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) return { luminance: 0.2, isBright: false, scrimOpacity: 0.2 };

		ctx.drawImage(videoEl, 0, 0, 16, 16);
		const data = ctx.getImageData(0, 0, 16, 16).data;

		let totalLuminance = 0;
		const pixelCount = data.length / 4;

		for (let i = 0; i < data.length; i += 4) {
			const r = data[i] / 255;
			const g = data[i + 1] / 255;
			const b = data[i + 2] / 255;
			totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
		}

		const avgLuminance = totalLuminance / pixelCount;
		const isBright = avgLuminance > 0.44;
		const scrimOpacity = isBright
			? Math.min(0.55, 0.32 + (avgLuminance - 0.44) * 0.45)
			: 0.2;

		const result: LuminanceResult = {
			luminance: Number(avgLuminance.toFixed(3)),
			isBright,
			scrimOpacity: Number(scrimOpacity.toFixed(2))
		};

		applyLuminanceToDom(result);
		return result;
	} catch {
		return { luminance: 0.2, isBright: false, scrimOpacity: 0.2 };
	}
}

export function applyLuminanceToDom(result: LuminanceResult) {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	root.setAttribute('data-wallpaper-luminance', result.isBright ? 'bright' : 'dark');
	root.style.setProperty('--wallpaper-adaptive-scrim', `rgba(0, 0, 0, ${result.scrimOpacity})`);
	root.style.setProperty('--wallpaper-luminance', String(result.luminance));
}
