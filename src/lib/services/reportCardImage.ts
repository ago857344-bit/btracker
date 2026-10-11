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

	// Quick summary ribbon.
	const ribbonY = 405;
	const ribbonH = 76;
	const ribbonW = W - MARGIN * 2;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
	ctx.lineWidth = 1.5;
	rr(ctx, MARGIN, ribbonY, ribbonW, ribbonH, 16);
	ctx.fill();
	ctx.stroke();

	const ribbonStats = [
		{ label: 'TOTAL FOCUS', value: formatFocus(report.minutes) },
		{ label: 'QUESTIONS SOLVED', value: `${report.solved}` },
		{ label: 'ACTIVE DAYS', value: `${report.activeDays} / 7` },
		{ label: 'DAILY AVERAGE', value: `${(report.minutes / 60 / Math.max(1, report.activeDays)).toFixed(1)}h / day` }
	];
	const rColW = ribbonW / ribbonStats.length;
	ribbonStats.forEach((st, idx) => {
		const cx = MARGIN + idx * rColW + rColW / 2;
		ctx.textAlign = 'center';
		ctx.fillStyle = INK;
		ctx.font = `800 27px ${FONT}`;
		ctx.fillText(st.value, cx, ribbonY + 35);
		ctx.fillStyle = MUTED;
		ctx.font = `700 13px ${FONT}`;
		spaced(ctx, st.label, cx - spacedWidth(ctx, st.label, 3) / 2, ribbonY + 58, 3);

		if (idx < ribbonStats.length - 1) {
			ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
			ctx.fillRect(MARGIN + (idx + 1) * rColW, ribbonY + 16, 1, ribbonH - 32);
		}
	});

	// ─── Double Graph: Daily Hours & Questions ───
	const graphPanelY = 505;
	const graphPanelH = 610;
	const graphPanelW = W - MARGIN * 2;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
	ctx.lineWidth = 1.5;
	rr(ctx, MARGIN, graphPanelY, graphPanelW, graphPanelH, 24);
	ctx.fill();
	ctx.stroke();

	// Graph Title & Legend
	ctx.textAlign = 'left';
	ctx.fillStyle = INK;
	ctx.font = `800 20px ${FONT}`;
	spaced(ctx, 'DAILY ACTIVITY · HOURS & QUESTIONS', MARGIN + 32, graphPanelY + 44, 4);

	// Legend: Hours (accent) & Questions (emerald)
	const legendY = graphPanelY + 34;
	const leg1X = W - MARGIN - 380;
	// Hours legend box
	ctx.fillStyle = accent;
	rr(ctx, leg1X, legendY - 10, 16, 16, 4);
	ctx.fill();
	ctx.fillStyle = MUTED;
	ctx.font = `700 17px ${FONT}`;
	ctx.fillText('Study Hours', leg1X + 24, legendY + 4);

	// Questions legend box
	const leg2X = leg1X + 170;
	ctx.fillStyle = '#10b981';
	rr(ctx, leg2X, legendY - 10, 16, 16, 4);
	ctx.fill();
	ctx.fillStyle = MUTED;
	ctx.font = `700 17px ${FONT}`;
	ctx.fillText('Questions Solved', leg2X + 24, legendY + 4);

	// Gridlines & Scale
	const plotTop = graphPanelY + 120;
	const plotBottom = graphPanelY + 490;
	const plotH = plotBottom - plotTop; // 370px
	const maxH = Math.max(4, Math.ceil(report.maxDailyHours * 1.25));
	const maxQ = Math.max(30, Math.ceil(report.maxDailyQuestions * 1.25));

	// Top gridline
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
	ctx.setLineDash([6, 6]);
	ctx.beginPath();
	ctx.moveTo(MARGIN + 32, plotTop);
	ctx.lineTo(W - MARGIN - 32, plotTop);
	ctx.stroke();

	// Mid gridline
	const midY = plotTop + plotH / 2;
	ctx.beginPath();
	ctx.moveTo(MARGIN + 32, midY);
	ctx.lineTo(W - MARGIN - 32, midY);
	ctx.stroke();
	ctx.setLineDash([]);

	// Baseline
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
	ctx.beginPath();
	ctx.moveTo(MARGIN + 24, plotBottom);
	ctx.lineTo(W - MARGIN - 24, plotBottom);
	ctx.stroke();

	// Grid scale text
	ctx.textAlign = 'right';
	ctx.font = `600 14px ${FONT}`;
	ctx.fillStyle = hexToRgba(MUTED, 0.7);
	ctx.fillText(`${maxH}h / ${maxQ}Q`, W - MARGIN - 36, plotTop - 8);
	ctx.fillText(`${(maxH / 2).toFixed(0)}h / ${Math.round(maxQ / 2)}Q`, W - MARGIN - 36, midY - 8);

	// 7 Day Columns
	const colWidth = (graphPanelW - 64) / 7;
	const barW = 28;
	const barGap = 6;

	report.daily.forEach((day, i) => {
		const colCenterX = MARGIN + 32 + i * colWidth + colWidth / 2;
		const hoursBarX = colCenterX - barW - barGap / 2;
		const qBarX = colCenterX + barGap / 2;

		const hHeight = day.hours > 0 ? Math.max(8, Math.min(plotH, (day.hours / maxH) * plotH)) : 3;
		const qHeight = day.questions > 0 ? Math.max(8, Math.min(plotH, (day.questions / maxQ) * plotH)) : 3;

		// Hours bar
		if (day.hours > 0) {
			const hGrad = ctx.createLinearGradient(0, plotBottom - hHeight, 0, plotBottom);
			hGrad.addColorStop(0, accent);
			hGrad.addColorStop(1, hexToRgba(accent, 0.65));
			ctx.fillStyle = hGrad;
			rr(ctx, hoursBarX, plotBottom - hHeight, barW, hHeight, 6);
			ctx.fill();

			// Value text above
			ctx.textAlign = 'center';
			ctx.fillStyle = '#e2e0ff';
			ctx.font = `800 16px ${FONT}`;
			const valText = day.hours >= 1 ? `${day.hours}h` : `${day.minutes}m`;
			ctx.fillText(valText, hoursBarX + barW / 2, plotBottom - hHeight - 8);
		} else {
			ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
			rr(ctx, hoursBarX, plotBottom - 3, barW, 3, 2);
			ctx.fill();
		}

		// Questions bar
		if (day.questions > 0) {
			const qGrad = ctx.createLinearGradient(0, plotBottom - qHeight, 0, plotBottom);
			qGrad.addColorStop(0, '#10b981');
			qGrad.addColorStop(1, '#059669');
			ctx.fillStyle = qGrad;
			rr(ctx, qBarX, plotBottom - qHeight, barW, qHeight, 6);
			ctx.fill();

			// Value text above
			ctx.textAlign = 'center';
			ctx.fillStyle = '#a7f3d0';
			ctx.font = `800 16px ${FONT}`;
			ctx.fillText(`${day.questions}`, qBarX + barW / 2, plotBottom - qHeight - 8);
		} else {
			ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
			rr(ctx, qBarX, plotBottom - 3, barW, 3, 2);
			ctx.fill();
		}

		// Day Footer: Label & Date
		if (day.isToday) {
			ctx.fillStyle = hexToRgba(accent, 0.22);
			rr(ctx, colCenterX - 36, plotBottom + 12, 72, 38, 10);
			ctx.fill();
		}

		ctx.textAlign = 'center';
		ctx.font = `800 20px ${FONT}`;
		ctx.fillStyle = day.isToday ? accent : INK;
		ctx.fillText(day.dayLabel.toUpperCase(), colCenterX, plotBottom + 36);

		ctx.font = `700 14px ${FONT}`;
		ctx.fillStyle = MUTED;
		ctx.fillText(`${day.dateNum}`, colCenterX, plotBottom + 58);
	});

	// Bottom Stat strip.
	const statsTop = graphPanelY + graphPanelH + 24;
	const stats = [
		{ label: 'FOCUS', value: formatFocus(report.minutes) },
		{ label: 'SOLVED', value: `${report.solved}` },
		{ label: 'REVISIONS', value: `${report.revisions}` },
		{ label: 'MOCK TESTS', value: `${report.tests}` },
		{ label: 'ACTIVE DAYS', value: `${report.activeDays}/7` }
	];
	const colWidthStat = (W - MARGIN * 2) / stats.length;
	stats.forEach((stat, index) => {
		const colX = MARGIN + index * colWidthStat;
		ctx.fillStyle = INK;
		ctx.font = `800 38px ${FONT}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(stat.value, colX + colWidthStat / 2, statsTop + 38);
		ctx.fillStyle = MUTED;
		ctx.font = `700 15px ${FONT}`;
		spaced(ctx, stat.label, colX + colWidthStat / 2 - spacedWidth(ctx, stat.label, 4) / 2, statsTop + 68, 4);
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
