/**
 * Universal Native Picture-in-Picture (PiP) Engine
 * Provides OS-level always-on-top floating focus timer windows using:
 * 1. Document Picture-in-Picture API (Chrome 116+, Edge, Arc, Brave)
 * 2. Canvas-to-Video Stream PiP with MediaSession API fallback (Safari, Firefox)
 */

import { writable } from 'svelte/store';
import { globalTimer } from '$lib/stores/timerState';
import { subjectColor, subjectName } from '$lib/state/subjects';
import { celebration } from '$lib/stores/tracker';

export const nativePipActive = writable<boolean>(false);

let pipWindow: Window | null = null;
let fallbackVideo: HTMLVideoElement | null = null;
let fallbackCanvas: HTMLCanvasElement | null = null;
let fallbackAnimFrame: number | null = null;
let timerUnsub: (() => void) | null = null;

export function isDocumentPipSupported(): boolean {
	return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

export function isVideoPipSupported(): boolean {
	return typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;
}

export function isNativePipSupported(): boolean {
	return isDocumentPipSupported() || isVideoPipSupported();
}

/**
 * Open native OS Picture-in-Picture window
 */
export async function openNativePip(): Promise<boolean> {
	if (typeof window === 'undefined') return false;

	// Close existing window if any
	if (pipWindow) {
		try { pipWindow.close(); } catch {}
		pipWindow = null;
	}

	// 1. Try modern Document Picture-in-Picture API
	if (isDocumentPipSupported()) {
		try {
			// @ts-ignore
			pipWindow = await window.documentPictureInPicture.requestWindow({
				width: 320,
				height: 200
			});

			if (pipWindow) {
				setupDocumentPip(pipWindow);
				nativePipActive.set(true);
				return true;
			}
		} catch (err) {
			console.warn('Document PiP request failed, falling back to Canvas PiP:', err);
		}
	}

	// 2. Fallback to Canvas Video PiP
	if (isVideoPipSupported()) {
		try {
			const success = await setupCanvasPip();
			if (success) {
				nativePipActive.set(true);
				return true;
			}
		} catch (err) {
			console.error('Canvas Video PiP failed:', err);
		}
	}

	celebration.set('Picture-in-Picture is not supported in this browser.');
	return false;
}

/**
 * Close native OS Picture-in-Picture window
 */
export function closeNativePip() {
	if (pipWindow) {
		try { pipWindow.close(); } catch {}
		pipWindow = null;
	}

	if (fallbackVideo && document.pictureInPictureElement === fallbackVideo) {
		try { document.exitPictureInPicture(); } catch {}
	}

	if (fallbackAnimFrame) {
		cancelAnimationFrame(fallbackAnimFrame);
		fallbackAnimFrame = null;
	}

	if (timerUnsub) {
		timerUnsub();
		timerUnsub = null;
	}

	nativePipActive.set(false);
}

export async function toggleNativePip(): Promise<boolean> {
	if (pipWindow || (document.pictureInPictureElement && document.pictureInPictureElement === fallbackVideo)) {
		closeNativePip();
		return false;
	}
	return openNativePip();
}

/**
 * Setup DOM Picture-in-Picture Window with interactive controls
 */
function setupDocumentPip(win: Window) {
	const doc = win.document;
	doc.title = 'BTracker Focus PiP';

	// Inject styles
	const style = doc.createElement('style');
	style.textContent = `
		* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
		body {
			background: #09090f;
			color: #ffffff;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			height: 100vh;
			padding: 12px 14px;
			overflow: hidden;
		}
		.pip-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.sub-pill {
			font-size: 11px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			padding: 3px 8px;
			border-radius: 999px;
			border: 1px solid rgba(255, 255, 255, 0.2);
			display: inline-flex;
			align-items: center;
			gap: 4px;
		}
		.chapter-name {
			font-size: 11px;
			color: rgba(255, 255, 255, 0.6);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			max-width: 140px;
		}
		.phase-badge {
			font-size: 10px;
			font-weight: 800;
			color: #38bdf8;
			letter-spacing: 0.05em;
		}
		.pip-main {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-direction: column;
			gap: 4px;
		}
		.timer-clock {
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			font-size: 42px;
			font-weight: 800;
			letter-spacing: -0.04em;
			line-height: 1;
			text-shadow: 0 0 24px rgba(109, 93, 252, 0.4);
		}
		.progress-bar {
			width: 100%;
			height: 4px;
			background: rgba(255, 255, 255, 0.12);
			border-radius: 999px;
			overflow: hidden;
			margin-top: 4px;
		}
		.progress-fill {
			height: 100%;
			background: #6d5dfc;
			transition: width 0.3s ease;
		}
		.pip-actions {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
		}
		button {
			background: rgba(255, 255, 255, 0.08);
			border: 1px solid rgba(255, 255, 255, 0.16);
			color: #ffffff;
			border-radius: 999px;
			padding: 6px 14px;
			font-size: 12px;
			font-weight: 650;
			cursor: pointer;
			display: inline-flex;
			align-items: center;
			gap: 4px;
			transition: background 0.15s ease, transform 0.1s ease;
		}
		button:active { transform: scale(0.95); }
		button.primary {
			background: #6d5dfc;
			border-color: #6d5dfc;
			color: #ffffff;
			padding: 6px 18px;
		}
		button.danger {
			background: rgba(239, 68, 68, 0.2);
			border-color: rgba(239, 68, 68, 0.4);
			color: #fca5a5;
		}
	`;
	doc.head.appendChild(style);

	// Container HTML
	doc.body.innerHTML = `
		<div class="pip-header">
			<span id="subPill" class="sub-pill">Focus</span>
			<span id="chapterName" class="chapter-name"></span>
			<span id="phaseBadge" class="phase-badge">FOCUS</span>
		</div>
		<div class="pip-main">
			<div id="timerClock" class="timer-clock">25:00</div>
			<div class="progress-bar"><div id="progressFill" class="progress-fill" style="width: 0%;"></div></div>
		</div>
		<div class="pip-actions">
			<button id="addFiveBtn" type="button">+5m</button>
			<button id="toggleBtn" class="primary" type="button">▶ Start</button>
			<button id="endBtn" class="danger" type="button">Done</button>
		</div>
	`;

	const subPillEl = doc.getElementById('subPill');
	const chapterEl = doc.getElementById('chapterName');
	const phaseEl = doc.getElementById('phaseBadge');
	const clockEl = doc.getElementById('timerClock');
	const fillEl = doc.getElementById('progressFill');
	const toggleBtn = doc.getElementById('toggleBtn');
	const addFiveBtn = doc.getElementById('addFiveBtn');
	const endBtn = doc.getElementById('endBtn');

	// Wire buttons
	toggleBtn?.addEventListener('click', () => {
		let current: any;
		const unsub = globalTimer.subscribe((v) => (current = v));
		unsub();
		if (current) current.toggle();
	});

	addFiveBtn?.addEventListener('click', () => {
		let current: any;
		const unsub = globalTimer.subscribe((v) => (current = v));
		unsub();
		if (current) current.addFive();
	});

	endBtn?.addEventListener('click', () => {
		let current: any;
		const unsub = globalTimer.subscribe((v) => (current = v));
		unsub();
		if (current) current.stop();
		closeNativePip();
	});

	// Subscribe to timer state
	timerUnsub = globalTimer.subscribe((state) => {
		if (!state) return;
		const sColor = state.subject ? subjectColor(state.subject) : '#6d5dfc';
		const sLabel = state.subject ? subjectName(state.subject) : 'Focus';

		if (clockEl) clockEl.textContent = state.dialTime || '25:00';
		if (fillEl) {
			fillEl.style.width = `${Math.min(100, Math.max(0, state.ringProgress * 100))}%`;
			fillEl.style.background = sColor;
		}

		if (subPillEl) {
			subPillEl.textContent = sLabel;
			subPillEl.style.color = sColor;
			subPillEl.style.borderColor = sColor;
		}

		if (chapterEl) chapterEl.textContent = state.chapter || '';
		if (phaseEl) {
			phaseEl.textContent = state.phase === 'break' ? 'COOLDOWN BREAK' : 'DEEP FOCUS';
			phaseEl.style.color = state.phase === 'break' ? '#4ade80' : '#38bdf8';
		}

		if (toggleBtn) {
			toggleBtn.innerHTML = state.running ? '⏸ Pause' : '▶ Resume';
			toggleBtn.style.background = state.running ? sColor : '#6d5dfc';
			toggleBtn.style.borderColor = state.running ? sColor : '#6d5dfc';
		}
	});

	win.addEventListener('pagehide', () => {
		pipWindow = null;
		if (timerUnsub) {
			timerUnsub();
			timerUnsub = null;
		}
		nativePipActive.set(false);
	});
}

/**
 * Setup Video PiP streaming from an offscreen Canvas
 */
async function setupCanvasPip(): Promise<boolean> {
	if (!fallbackCanvas) {
		fallbackCanvas = document.createElement('canvas');
		fallbackCanvas.width = 480;
		fallbackCanvas.height = 300;
	}

	if (!fallbackVideo) {
		fallbackVideo = document.createElement('video');
		fallbackVideo.muted = true;
		fallbackVideo.playsInline = true;
		fallbackVideo.style.position = 'fixed';
		fallbackVideo.style.opacity = '0';
		fallbackVideo.style.pointerEvents = 'none';
		fallbackVideo.style.zIndex = '-9999';
		document.body.appendChild(fallbackVideo);
	}

	const ctx = fallbackCanvas.getContext('2d');
	if (!ctx) return false;

	// Render canvas loop
	function drawFrame() {
		let state: any;
		const unsub = globalTimer.subscribe((v) => (state = v));
		unsub();

		if (!ctx || !fallbackCanvas) return;
		const w = fallbackCanvas.width;
		const h = fallbackCanvas.height;

		// Dark background with gradient
		const grad = ctx.createLinearGradient(0, 0, w, h);
		grad.addColorStop(0, '#0a0a14');
		grad.addColorStop(1, '#110f22');
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, w, h);

		const sColor = state?.subject ? subjectColor(state.subject) : '#6d5dfc';
		const sLabel = state?.subject ? subjectName(state.subject) : 'Focus Session';
		const dialTime = state?.dialTime || '25:00';
		const progress = Math.min(1, Math.max(0, state?.ringProgress || 0));

		// Circular progress ring
		const centerX = w / 2;
		const centerY = h / 2 - 10;
		const radius = 85;

		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		ctx.lineWidth = 10;
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
		ctx.stroke();

		// Active ring
		if (progress > 0) {
			ctx.beginPath();
			ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
			ctx.lineWidth = 10;
			ctx.strokeStyle = sColor;
			ctx.lineCap = 'round';
			ctx.stroke();
		}

		// Text: Time
		ctx.font = '800 52px ui-monospace, monospace';
		ctx.fillStyle = '#ffffff';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(dialTime, centerX, centerY);

		// Subject badge
		ctx.font = '700 16px -apple-system, sans-serif';
		ctx.fillStyle = sColor;
		ctx.fillText(sLabel, centerX, centerY + radius + 28);

		// Status pill
		ctx.font = '600 13px -apple-system, sans-serif';
		ctx.fillStyle = state?.running ? '#38bdf8' : 'rgba(255, 255, 255, 0.6)';
		ctx.fillText(state?.running ? '● FOCUSING' : '❚❚ PAUSED', centerX, 28);

		fallbackAnimFrame = requestAnimationFrame(drawFrame);
	}

	drawFrame();

	// @ts-ignore
	const stream = fallbackCanvas.captureStream(30);
	fallbackVideo.srcObject = stream;
	await fallbackVideo.play();
	await fallbackVideo.requestPictureInPicture();

	fallbackVideo.addEventListener('leavepictureinpicture', () => {
		closeNativePip();
	});

	// Hook media session for lockscreen / PiP controls
	if ('mediaSession' in navigator) {
		navigator.mediaSession.metadata = new MediaMetadata({
			title: 'BTracker Focus Timer',
			artist: 'Study Session',
			album: 'BTracker'
		});

		navigator.mediaSession.setActionHandler('play', () => {
			let cur: any;
			const u = globalTimer.subscribe((v) => (cur = v));
			u();
			if (cur) cur.start(cur.subject || 'P', 25 * 60, cur.chapter || '');
		});

		navigator.mediaSession.setActionHandler('pause', () => {
			let cur: any;
			const u = globalTimer.subscribe((v) => (cur = v));
			u();
			if (cur) cur.toggle();
		});
	}

	return true;
}
