import { TIER_STYLE } from '$lib/state/weekly';
import type { WeekReport } from '$lib/state/weekly';

const W = 1080;
const H = 1350;
const MARGIN = 72;

const INK = '#f4f4fa';
const MUTED = '#8b87a0';
const SUCCESS = '#3ddc84';
const DANGER = '#e0455a';
const FONT = "-apple-system, 'Segoe UI', Inter, Roboto, sans-serif";

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	const radius = Math.min(r, w / 2, h / 2);
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + w, y, x + w, y + h, radius);
	ctx.arcTo(x + w, y + h, x, y + h, radius);
	ctx.arcTo(x, y + h, x, y, radius);
	ctx.arcTo(x, y, x + w, y, radius);
	ctx.closePath();
}

/** Manual letter-spacing so smallcaps labels render identically in every webview. */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
	let cursor = x;
	for (const ch of text) {
		ctx.fillText(ch, cursor, y);
		cursor += ctx.measureText(ch).width + spacing;
	}
}

const spacedWidth = (ctx: CanvasRenderingContext2D, text: string, spacing: number) => {
	let width = 0;
	for (const ch of text) width += ctx.measureText(ch).width + spacing;
	return width - spacing;
};

function hexToRgba(hex: string, alpha: number) {
	const value = hex.replace('#', '');
	const r = parseInt(value.slice(0, 2), 16);
	const g = parseInt(value.slice(2, 4), 16);
	const b = parseInt(value.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const formatFocus = (minutes: number) => {
	const total = Math.max(0, Math.round(minutes));
	const h = Math.floor(total / 60);
	const m = total % 60;
	if (h && m) return `${h}h ${m}m`;
	if (h) return `${h}h`;
	return `${m}m`;
};

const signed = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`);

/** Paint the weekly report as a 1080×1350 shareable poster. */
export async function renderReportImage(report: WeekReport): Promise<Blob> {
	await document.fonts.ready;

	const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6d5dfc';

	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d')!;

	// Background: deep vertical gradient + accent glow + dot grid.
	const bg = ctx.createLinearGradient(0, 0, 0, H);
	bg.addColorStop(0, '#0a0a18');
	bg.addColorStop(1, '#141428');
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, W, H);

	const glow = ctx.createRadialGradient(MARGIN, 180, 40, MARGIN, 180, 620);
	glow.addColorStop(0, hexToRgba(accent, 0.32));
	glow.addColorStop(1, hexToRgba(accent, 0));
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, W, H);

	ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
	for (let gx = MARGIN; gx <= W - MARGIN; gx += 36) {
		for (let gy = 720; gy <= H - MARGIN; gy += 36) {
			ctx.beginPath();
			ctx.arc(gx, gy, 1.6, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	// Header: brand mark + titles, week range right-aligned.
	const markGradient = ctx.createLinearGradient(MARGIN, MARGIN, MARGIN + 64, MARGIN + 64);
	markGradient.addColorStop(0, accent);
	markGradient.addColorStop(1, hexToRgba(accent, 0.55));
	ctx.fillStyle = markGradient;
	rr(ctx, MARGIN, MARGIN, 64, 64, 18);
	ctx.fill();
	ctx.fillStyle = '#ffffff';
	ctx.font = `800 36px ${FONT}`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('B', MARGIN + 32, MARGIN + 34);

	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = INK;
	ctx.font = `800 32px ${FONT}`;
	ctx.fillText('BTRACKER', MARGIN + 88, MARGIN + 30);
	ctx.fillStyle = MUTED;
	ctx.font = `700 19px ${FONT}`;
	spaced(ctx, 'WEEKLY REPORT CARD', MARGIN + 88, MARGIN + 60, 5);

	ctx.textAlign = 'right';
	ctx.font = `800 24px ${FONT}`;
	ctx.fillStyle = hexToRgba(accent, 0.95);
	ctx.fillText(report.label, W - MARGIN, MARGIN + 32);
	ctx.fillStyle = MUTED;
	ctx.font = `700 18px ${FONT}`;
	ctx.fillText(`GENERATED ${report.generatedLabel}`, W - MARGIN, MARGIN + 60);

	// Hairline under header.
	ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
	ctx.fillRect(MARGIN, 196, W - MARGIN * 2, 2);

	// Player identity.
	ctx.textAlign = 'left';
	ctx.fillStyle = INK;
	ctx.font = `850 72px ${FONT}`;
	const name = report.name.length > 18 ? `${report.name.slice(0, 18)}…` : report.name;
	ctx.fillText(name, MARGIN, 316);

	// Tier pill + level caption on one row.
	const pillY = 356;
	const pillH = 62;
	ctx.font = `800 27px ${FONT}`;
	const pillText = `${report.tier.icon}  ${report.tier.name.toUpperCase()}${report.prestige ? `  ${report.prestige > 3 ? `★${report.prestige}` : '★'.repeat(report.prestige)}` : ''}`;
	const pillTextWidth = ctx.measureText(pillText).width;
	const pillW = pillTextWidth + 48;
	const tierStyle = TIER_STYLE[report.tier.cls] ?? TIER_STYLE.bronze;
	const pillGradient = ctx.createLinearGradient(MARGIN, pillY, MARGIN + pillW, pillY + pillH);
	pillGradient.addColorStop(0, tierStyle.from);
	pillGradient.addColorStop(1, tierStyle.to);
	ctx.fillStyle = pillGradient;
	rr(ctx, MARGIN, pillY, pillW, pillH, 31);
	ctx.fill();
	ctx.fillStyle = tierStyle.text;
	ctx.textBaseline = 'middle';
	ctx.fillText(pillText, MARGIN + 24, pillY + pillH / 2 + 1);

	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = accent;
	ctx.font = `800 23px ${FONT}`;
	spaced(ctx, `LEVEL ${report.level} · ${(report.flairTitle ?? report.levelTitle).toUpperCase()}`, MARGIN + pillW + 28, pillY + pillH / 2 + 8, 4);

	// XP hero.
	ctx.fillStyle = INK;
	ctx.font = `900 158px ${FONT}`;
	ctx.shadowColor = hexToRgba(accent, 0.45);
	ctx.shadowBlur = 42;
	ctx.fillText(`+${report.xpGained.toLocaleString('en-US')}`, MARGIN, 648);
	ctx.shadowBlur = 0;
	ctx.fillStyle = MUTED;
	ctx.font = `700 24px ${FONT}`;
	spaced(ctx, 'XP EARNED THIS WEEK', MARGIN + 4, 700, 8);

	// Elo movement rows.
	const eloLabelY = 800;
	ctx.fillStyle = MUTED;
	ctx.font = `800 20px ${FONT}`;
	spaced(ctx, 'ELO MOVEMENT', MARGIN, eloLabelY, 7);

	const rowHeight = 88;
	report.subjects.forEach((sub, index) => {
		const rowY = eloLabelY + 34 + index * rowHeight;

		ctx.fillStyle = sub.color;
		ctx.beginPath();
		ctx.arc(MARGIN + 14, rowY + 34, 10, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = INK;
		ctx.font = `750 34px ${FONT}`;
		ctx.textBaseline = 'middle';
		ctx.fillText(sub.name, MARGIN + 44, rowY + 34);

		ctx.font = `800 22px ${FONT}`;
		const rankText = sub.rankName.toUpperCase();
		const rankW = ctx.measureText(rankText).width + 32;
		ctx.fillStyle = hexToRgba(sub.rankColor, 0.16);
		rr(ctx, MARGIN + 260, rowY + 12, rankW, 44, 22);
		ctx.fill();
		ctx.fillStyle = sub.rankColor;
		ctx.fillText(rankText, MARGIN + 276, rowY + 35);

		ctx.textAlign = 'right';
		ctx.fillStyle = INK;
		ctx.font = `850 46px ${FONT}`;
		ctx.fillText(`${sub.elo}`, W - MARGIN - 120, rowY + 34);

		const deltaColor = sub.delta > 0 ? SUCCESS : sub.delta < 0 ? DANGER : MUTED;
		ctx.fillStyle = deltaColor;
		ctx.font = `800 30px ${FONT}`;
		const arrow = sub.delta > 0 ? '▲' : sub.delta < 0 ? '▼' : '—';
		ctx.fillText(sub.delta === 0 ? '— 0' : `${arrow} ${signed(sub.delta)}`, W - MARGIN, rowY + 36);
		ctx.textAlign = 'left';

		if (index < report.subjects.length - 1) {
			ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
			ctx.fillRect(MARGIN, rowY + rowHeight - 12, W - MARGIN * 2, 2);
		}
	});

	// Stat strip.
	const statsTop = eloLabelY + 34 + report.subjects.length * rowHeight + 36;
	const stats = [
		{ label: 'FOCUS', value: formatFocus(report.minutes) },
		{ label: 'SOLVED', value: `${report.solved}` },
		{ label: 'REVISIONS', value: `${report.revisions}` },
		{ label: 'TESTS', value: `${report.tests}` },
		{ label: 'MISTAKES', value: `${report.mistakes}` }
	];
	const colWidth = (W - MARGIN * 2) / stats.length;
	stats.forEach((stat, index) => {
		const colX = MARGIN + index * colWidth;
		ctx.fillStyle = INK;
		ctx.font = `800 44px ${FONT}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(stat.value, colX + colWidth / 2, statsTop + 44);
		ctx.fillStyle = MUTED;
		ctx.font = `700 17px ${FONT}`;
		spaced(ctx, stat.label, colX + colWidth / 2 - spacedWidth(ctx, stat.label, 5) / 2, statsTop + 80, 5);
	});
	ctx.textAlign = 'left';

	// Footer.
	ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
	ctx.fillRect(MARGIN, H - 96, W - MARGIN * 2, 2);
	ctx.fillStyle = MUTED;
	ctx.font = `italic 600 26px ${FONT}`;
	ctx.fillText('Consistency compounds. See you next week.', MARGIN, H - 44);
	ctx.textAlign = 'right';
	ctx.font = `700 17px ${FONT}`;
	spaced(ctx, 'BTRACKER · JEE GRIND COMPANION', W - MARGIN, H - 48, 4);

	if (report.frameColors?.length) {
		const frame = ctx.createLinearGradient(0, 0, W, H);
		report.frameColors.forEach((color, i) => frame.addColorStop(i / Math.max(1, report.frameColors!.length - 1), color));
		ctx.strokeStyle = frame;
		ctx.lineWidth = 10;
		ctx.shadowColor = hexToRgba(report.frameColors[Math.floor(report.frameColors.length / 2)], 0.6);
		ctx.shadowBlur = 24;
		rr(ctx, 22, 22, W - 44, H - 44, 40);
		ctx.stroke();
		ctx.shadowBlur = 0;
	}

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), 'image/png');
	});
}
