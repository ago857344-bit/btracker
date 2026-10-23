/**
 * Organic Canvas Particle Fireworks & Confetti Celebration Engine for BTracker
 * Zero-dependency, GPU-accelerated canvas 2D particle simulation.
 */

export interface ConfettiOptions {
	count?: number;
	origin?: { x: number; y: number }; // x and y normalized between 0 and 1, e.g. { x: 0.5, y: 0.6 }
	spread?: number;
	colors?: string[];
	scalar?: number;
	gravity?: number;
	drift?: number;
}

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	color: string;
	alpha: number;
	decay: number;
	rotation: number;
	rotationSpeed: number;
	wobble: number;
	wobbleSpeed: number;
	shape: 'ribbon' | 'circle' | 'star';
}

let activeCanvas: HTMLCanvasElement | null = null;
let activeCtx: CanvasRenderingContext2D | null = null;
let animationFrameId: number | null = null;
const particles: Particle[] = [];

function getThemeColors(): string[] {
	if (typeof window === 'undefined') return ['#6d5dfc', '#ffd700', '#2af598', '#00f2fe', '#ff3366'];
	const computed = getComputedStyle(document.documentElement);
	const accent = computed.getPropertyValue('--accent')?.trim() || '#6d5dfc';
	const success = computed.getPropertyValue('--success')?.trim() || '#2af598';
	return [
		accent,
		'#ffd700', // Gold
		success,   // Emerald
		'#00f2fe', // Electric Cyan
		'#ff3366', // Crimson Pink
		'#a855f7', // Vivid Purple
		'#ffffff'  // Bright sparkle
	];
}

function ensureCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
	if (typeof window === 'undefined' || typeof document === 'undefined') return null;

	if (!activeCanvas) {
		activeCanvas = document.createElement('canvas');
		activeCanvas.id = 'btracker-celebration-canvas';
		activeCanvas.setAttribute(
			'style',
			'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:999999;user-select:none;transform:translateZ(0);'
		);
		document.body.appendChild(activeCanvas);
		activeCtx = activeCanvas.getContext('2d', { alpha: true });

		const resize = () => {
			if (!activeCanvas) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			activeCanvas.width = window.innerWidth * dpr;
			activeCanvas.height = window.innerHeight * dpr;
		};
		resize();
		window.addEventListener('resize', resize, { passive: true });
	}

	return activeCtx && activeCanvas ? { canvas: activeCanvas, ctx: activeCtx } : null;
}

function createParticle(originX: number, originY: number, colors: string[], scalar = 1): Particle {
	const angle = (Math.random() * 360 * Math.PI) / 180;
	// Blast velocity with upward bias
	const velocity = (Math.random() * 12 + 6) * scalar;
	const vx = Math.cos(angle) * velocity;
	const vy = Math.sin(angle) * velocity - (Math.random() * 8 + 4) * scalar;

	const shapes: Array<'ribbon' | 'circle' | 'star'> = ['ribbon', 'ribbon', 'circle', 'star'];
	const shape = shapes[Math.floor(Math.random() * shapes.length)];
	const color = colors[Math.floor(Math.random() * colors.length)];

	return {
		x: originX,
		y: originY,
		vx,
		vy,
		size: (Math.random() * 6 + 5) * scalar,
		color,
		alpha: 1,
		decay: Math.random() * 0.012 + 0.008,
		rotation: Math.random() * 360,
		rotationSpeed: (Math.random() - 0.5) * 12,
		wobble: Math.random() * 10,
		wobbleSpeed: Math.random() * 0.1 + 0.05,
		shape
	};
}

function updateAndRender() {
	if (!activeCanvas || !activeCtx) return;
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const width = activeCanvas.width;
	const height = activeCanvas.height;

	activeCtx.clearRect(0, 0, width, height);

	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];

		p.vx *= 0.96; // drag
		p.vy += 0.38 * dpr; // gravity
		p.x += p.vx * dpr;
		p.y += p.vy * dpr;
		p.wobble += p.wobbleSpeed;
		p.rotation += p.rotationSpeed;
		p.alpha -= p.decay;

		if (p.alpha <= 0 || p.y > height + 50) {
			particles.splice(i, 1);
			continue;
		}

		activeCtx.save();
		activeCtx.globalAlpha = Math.max(0, p.alpha);
		activeCtx.fillStyle = p.color;

		activeCtx.translate(p.x, p.y);
		activeCtx.rotate((p.rotation * Math.PI) / 180);

		const xWobble = Math.cos(p.wobble) * p.size;
		const yWobble = Math.sin(p.wobble) * (p.size * 0.4);

		if (p.shape === 'circle') {
			activeCtx.beginPath();
			activeCtx.arc(0, 0, Math.abs(xWobble), 0, Math.PI * 2);
			activeCtx.fill();
		} else if (p.shape === 'star') {
			activeCtx.beginPath();
			activeCtx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
			activeCtx.fill();
			// Sparkle glint
			activeCtx.fillRect(-p.size * 1.2, -1, p.size * 2.4, 2);
			activeCtx.fillRect(-1, -p.size * 1.2, 2, p.size * 2.4);
		} else {
			// 3D spinning ribbon
			activeCtx.fillRect(-xWobble / 2, -yWobble / 2, xWobble, p.size * 1.6);
		}

		activeCtx.restore();
	}

	if (particles.length > 0) {
		animationFrameId = requestAnimationFrame(updateAndRender);
	} else {
		if (activeCanvas && activeCanvas.parentNode) {
			activeCanvas.parentNode.removeChild(activeCanvas);
			activeCanvas = null;
			activeCtx = null;
		}
		animationFrameId = null;
	}
}

/**
 * Fires a burst of organic confetti / physics particles.
 */
export function celebrateConfetti(options?: ConfettiOptions): void {
	if (typeof window === 'undefined') return;

	// Check prefers-reduced-motion
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const setup = ensureCanvas();
	if (!setup) return;

	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const normX = options?.origin?.x ?? 0.5;
	const normY = options?.origin?.y ?? 0.6;
	const originX = normX * window.innerWidth * dpr;
	const originY = normY * window.innerHeight * dpr;

	const count = options?.count ?? 68;
	const colors = options?.colors ?? getThemeColors();
	const scalar = options?.scalar ?? 1;

	for (let i = 0; i < count; i++) {
		particles.push(createParticle(originX, originY, colors, scalar));
	}

	if (!animationFrameId) {
		animationFrameId = requestAnimationFrame(updateAndRender);
	}
}

/**
 * Listen for global celebration event
 */
if (typeof window !== 'undefined') {
	window.addEventListener('btracker:confetti', (e: Event) => {
		const detail = (e as CustomEvent<ConfettiOptions>).detail;
		celebrateConfetti(detail);
	});
}
