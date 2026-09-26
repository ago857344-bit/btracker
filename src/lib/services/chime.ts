let ctx: AudioContext | null = null;

function ensureContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!Ctor) return null;
	if (!ctx) ctx = new Ctor();
	if (ctx.state === 'suspended') void ctx.resume();
	return ctx;
}

/** Short two-tone chime; `up` for focus-end, `down` for break-end. */
export function playChime(kind: 'up' | 'down' = 'up') {
	const audio = ensureContext();
	if (!audio) return;
	const now = audio.currentTime;
	const freqs = kind === 'up' ? [660, 880] : [880, 587];
	freqs.forEach((freq, i) => {
		const osc = audio.createOscillator();
		const gain = audio.createGain();
		osc.type = 'sine';
		osc.frequency.value = freq;
		const start = now + i * 0.16;
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
		osc.connect(gain).connect(audio.destination);
		osc.start(start);
		osc.stop(start + 0.32);
	});
}
