import { TIER_STYLE } from '$lib/state/weekly';
import type { WeekReport } from '$lib/state/weekly';
import type { DailyReport } from '$lib/state/dailyReport';

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
	ctx.font = `850 68px ${FONT}`;
	const name = report.name.length > 18 ? `${report.name.slice(0, 18)}…` : report.name;
	ctx.fillText(name, MARGIN, 296);

	// Tier pill + level caption on one row.
	const pillY = 328;
	const pillH = 54;
	ctx.font = `800 24px ${FONT}`;
	const pillText = `${report.tier.icon}  ${report.tier.name.toUpperCase()}${report.prestige ? `  ${report.prestige > 3 ? `★${report.prestige}` : '★'.repeat(report.prestige)}` : ''}`;
	const pillTextWidth = ctx.measureText(pillText).width;
	const pillW = pillTextWidth + 44;
	const tierStyle = TIER_STYLE[report.tier.cls] ?? TIER_STYLE.bronze;
	const pillGradient = ctx.createLinearGradient(MARGIN, pillY, MARGIN + pillW, pillY + pillH);
	pillGradient.addColorStop(0, tierStyle.from);
	pillGradient.addColorStop(1, tierStyle.to);
	ctx.fillStyle = pillGradient;
	rr(ctx, MARGIN, pillY, pillW, pillH, 27);
	ctx.fill();
	ctx.fillStyle = tierStyle.text;
	ctx.textBaseline = 'middle';
	ctx.fillText(pillText, MARGIN + 22, pillY + pillH / 2 + 1);

	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = accent;
	ctx.font = `800 21px ${FONT}`;
	spaced(ctx, `LEVEL ${report.level} · ${(report.flairTitle ?? report.levelTitle).toUpperCase()}`, MARGIN + pillW + 24, pillY + pillH / 2 + 7, 4);

	// ─── Evident Hero Stat Boxes (Bot & User Friendly) ───
	const heroY = 405;
	const heroH = 142;
	const heroCardW = (W - MARGIN * 2 - 20) / 2;

	// Hours Hero Box
	ctx.fillStyle = hexToRgba(accent, 0.12);
	ctx.strokeStyle = hexToRgba(accent, 0.4);
	ctx.lineWidth = 2;
	rr(ctx, MARGIN, heroY, heroCardW, heroH, 18);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = accent;
	ctx.font = `800 18px ${FONT}`;
	spaced(ctx, '⏱️ HOURS FOCUSED THIS WEEK', MARGIN + 24, heroY + 36, 3);

	ctx.fillStyle = '#ffffff';
	ctx.font = `900 68px ${FONT}`;
	const weekHStr = `${(report.minutes / 60).toFixed(1)}h`;
	ctx.fillText(weekHStr, MARGIN + 24, heroY + 104);

	ctx.fillStyle = MUTED;
	ctx.font = `700 15px ${FONT}`;
	ctx.fillText(`${formatFocus(report.minutes)} · ${report.sessions} SESSIONS`, MARGIN + 24, heroY + 128);

	// Questions Hero Box
	const qBoxX = MARGIN + heroCardW + 20;
	ctx.fillStyle = hexToRgba('#10b981', 0.12);
	ctx.strokeStyle = hexToRgba('#10b981', 0.4);
	ctx.lineWidth = 2;
	rr(ctx, qBoxX, heroY, heroCardW, heroH, 18);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = '#10b981';
	ctx.font = `800 18px ${FONT}`;
	spaced(ctx, '📝 QUESTIONS SOLVED THIS WEEK', qBoxX + 24, heroY + 36, 3);

	ctx.fillStyle = '#ffffff';
	ctx.font = `900 68px ${FONT}`;
	ctx.fillText(`${report.solved}`, qBoxX + 24, heroY + 104);

	ctx.fillStyle = MUTED;
	ctx.font = `700 15px ${FONT}`;
	ctx.fillText(`ACTIVE ACROSS ${report.activeDays} / 7 DAYS`, qBoxX + 24, heroY + 128);

	// ─── Double Graph: Daily Hours & Questions ───
	const graphPanelY = 565;
	const graphPanelH = 555;
	const graphPanelW = W - MARGIN * 2;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
	ctx.lineWidth = 1.5;
	rr(ctx, MARGIN, graphPanelY, graphPanelW, graphPanelH, 22);
	ctx.fill();
	ctx.stroke();

	// Graph Title & Legend
	ctx.textAlign = 'left';
	ctx.fillStyle = INK;
	ctx.font = `800 19px ${FONT}`;
	spaced(ctx, 'DAILY BREAKDOWN · 7 DAYS', MARGIN + 28, graphPanelY + 38, 3);

	// Legend: Hours (accent) & Questions (emerald)
	const legendY = graphPanelY + 30;
	const leg1X = W - MARGIN - 360;
	ctx.fillStyle = accent;
	rr(ctx, leg1X, legendY - 10, 14, 14, 3);
	ctx.fill();
	ctx.fillStyle = MUTED;
	ctx.font = `700 16px ${FONT}`;
	ctx.fillText('Study Hours', leg1X + 22, legendY + 3);

	const leg2X = leg1X + 160;
	ctx.fillStyle = '#10b981';
	rr(ctx, leg2X, legendY - 10, 14, 14, 3);
	ctx.fill();
	ctx.fillStyle = MUTED;
	ctx.font = `700 16px ${FONT}`;
	ctx.fillText('Questions Solved', leg2X + 22, legendY + 3);

	// Gridlines & Scale
	const plotTop = graphPanelY + 105;
	const plotBottom = graphPanelY + 450;
	const plotH = plotBottom - plotTop;
	const maxH = Math.max(4, Math.ceil(report.maxDailyHours * 1.25));
	const maxQ = Math.max(30, Math.ceil(report.maxDailyQuestions * 1.25));

	// Top gridline
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
	ctx.setLineDash([5, 5]);
	ctx.beginPath();
	ctx.moveTo(MARGIN + 28, plotTop);
	ctx.lineTo(W - MARGIN - 28, plotTop);
	ctx.stroke();

	// Mid gridline
	const midY = plotTop + plotH / 2;
	ctx.beginPath();
	ctx.moveTo(MARGIN + 28, midY);
	ctx.lineTo(W - MARGIN - 28, midY);
	ctx.stroke();
	ctx.setLineDash([]);

	// Baseline
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
	ctx.beginPath();
	ctx.moveTo(MARGIN + 20, plotBottom);
	ctx.lineTo(W - MARGIN - 20, plotBottom);
	ctx.stroke();

	// Grid scale text
	ctx.textAlign = 'right';
	ctx.font = `600 13px ${FONT}`;
	ctx.fillStyle = hexToRgba(MUTED, 0.7);
	ctx.fillText(`${maxH}h / ${maxQ}Q`, W - MARGIN - 32, plotTop - 6);
	ctx.fillText(`${(maxH / 2).toFixed(0)}h / ${Math.round(maxQ / 2)}Q`, W - MARGIN - 32, midY - 6);

	// 7 Day Columns
	const colWidth = (graphPanelW - 56) / 7;
	const barW = 26;
	const barGap = 6;

	report.daily.forEach((day, i) => {
		const colCenterX = MARGIN + 28 + i * colWidth + colWidth / 2;
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
			rr(ctx, hoursBarX, plotBottom - hHeight, barW, hHeight, 5);
			ctx.fill();

			ctx.textAlign = 'center';
			ctx.fillStyle = '#e2e0ff';
			ctx.font = `800 15px ${FONT}`;
			const valText = day.hours >= 1 ? `${day.hours}h` : `${day.minutes}m`;
			ctx.fillText(valText, hoursBarX + barW / 2, plotBottom - hHeight - 6);
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
			rr(ctx, qBarX, plotBottom - qHeight, barW, qHeight, 5);
			ctx.fill();

			ctx.textAlign = 'center';
			ctx.fillStyle = '#a7f3d0';
			ctx.font = `800 15px ${FONT}`;
			ctx.fillText(`${day.questions}`, qBarX + barW / 2, plotBottom - qHeight - 6);
		} else {
			ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
			rr(ctx, qBarX, plotBottom - 3, barW, 3, 2);
			ctx.fill();
		}

		// Day Footer: Label & Date
		if (day.isToday) {
			ctx.fillStyle = hexToRgba(accent, 0.22);
			rr(ctx, colCenterX - 34, plotBottom + 10, 68, 36, 8);
			ctx.fill();
		}

		ctx.textAlign = 'center';
		ctx.font = `800 19px ${FONT}`;
		ctx.fillStyle = day.isToday ? accent : INK;
		ctx.fillText(day.dayLabel.toUpperCase(), colCenterX, plotBottom + 32);

		ctx.font = `700 13px ${FONT}`;
		ctx.fillStyle = MUTED;
		ctx.fillText(`${day.dateNum}`, colCenterX, plotBottom + 52);
	});

	// Bottom Stat strip.
	const statsTop = graphPanelY + graphPanelH + 20;
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
		ctx.font = `800 36px ${FONT}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(stat.value, colX + colWidthStat / 2, statsTop + 36);
		ctx.fillStyle = MUTED;
		ctx.font = `700 14px ${FONT}`;
		spaced(ctx, stat.label, colX + colWidthStat / 2 - spacedWidth(ctx, stat.label, 4) / 2, statsTop + 64, 4);
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

/** Paint the daily report as a 1080×1350 shareable poster with prominent hours & questions. */
export async function renderDailyReportImage(report: DailyReport): Promise<Blob> {
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

	// Header: brand mark + titles, day & date right-aligned.
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
	spaced(ctx, 'DAILY PERFORMANCE CARD', MARGIN + 88, MARGIN + 60, 5);

	ctx.textAlign = 'right';
	ctx.font = `800 24px ${FONT}`;
	ctx.fillStyle = hexToRgba(accent, 0.95);
	ctx.fillText(report.dateLabel, W - MARGIN, MARGIN + 32);
	ctx.fillStyle = MUTED;
	ctx.font = `700 18px ${FONT}`;
	ctx.fillText(`${report.dayName} · STREAK ${report.streak}D`, W - MARGIN, MARGIN + 60);

	// Hairline under header.
	ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
	ctx.fillRect(MARGIN, 196, W - MARGIN * 2, 2);

	// Player identity.
	ctx.textAlign = 'left';
	ctx.fillStyle = INK;
	ctx.font = `850 68px ${FONT}`;
	const name = report.name.length > 18 ? `${report.name.slice(0, 18)}…` : report.name;
	ctx.fillText(name, MARGIN, 296);

	// Tier pill + level caption on one row.
	const pillY = 328;
	const pillH = 54;
	ctx.font = `800 24px ${FONT}`;
	const pillText = `${report.tier.icon}  ${report.tier.name.toUpperCase()}${report.prestige ? `  ${report.prestige > 3 ? `★${report.prestige}` : '★'.repeat(report.prestige)}` : ''}`;
	const pillTextWidth = ctx.measureText(pillText).width;
	const pillW = pillTextWidth + 44;
	const tierStyle = TIER_STYLE[report.tier.cls] ?? TIER_STYLE.bronze;
	const pillGradient = ctx.createLinearGradient(MARGIN, pillY, MARGIN + pillW, pillY + pillH);
	pillGradient.addColorStop(0, tierStyle.from);
	pillGradient.addColorStop(1, tierStyle.to);
	ctx.fillStyle = pillGradient;
	rr(ctx, MARGIN, pillY, pillW, pillH, 27);
	ctx.fill();
	ctx.fillStyle = tierStyle.text;
	ctx.textBaseline = 'middle';
	ctx.fillText(pillText, MARGIN + 22, pillY + pillH / 2 + 1);

	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = accent;
	ctx.font = `800 21px ${FONT}`;
	spaced(ctx, `LEVEL ${report.level} · ${(report.flairTitle ?? report.levelTitle).toUpperCase()}`, MARGIN + pillW + 24, pillY + pillH / 2 + 7, 4);

	// ─── Evident Hero Stat Boxes (Bot & User Friendly) ───
	const heroY = 405;
	const heroH = 142;
	const heroCardW = (W - MARGIN * 2 - 20) / 2;

	// Hours Hero Box
	ctx.fillStyle = hexToRgba(accent, 0.12);
	ctx.strokeStyle = hexToRgba(accent, 0.4);
	ctx.lineWidth = 2;
	rr(ctx, MARGIN, heroY, heroCardW, heroH, 18);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = accent;
	ctx.font = `800 18px ${FONT}`;
	spaced(ctx, '⏱️ HOURS FOCUSED TODAY', MARGIN + 24, heroY + 36, 3);

	ctx.fillStyle = '#ffffff';
	ctx.font = `900 68px ${FONT}`;
	ctx.fillText(`${report.hours}h`, MARGIN + 24, heroY + 104);

	ctx.fillStyle = MUTED;
	ctx.font = `700 15px ${FONT}`;
	ctx.fillText(`${formatFocus(report.minutes)} · ${report.sessions} SESSIONS`, MARGIN + 24, heroY + 128);

	// Questions Hero Box
	const qBoxX = MARGIN + heroCardW + 20;
	ctx.fillStyle = hexToRgba('#10b981', 0.12);
	ctx.strokeStyle = hexToRgba('#10b981', 0.4);
	ctx.lineWidth = 2;
	rr(ctx, qBoxX, heroY, heroCardW, heroH, 18);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = '#10b981';
	ctx.font = `800 18px ${FONT}`;
	spaced(ctx, '📝 QUESTIONS SOLVED TODAY', qBoxX + 24, heroY + 36, 3);

	ctx.fillStyle = '#ffffff';
	ctx.font = `900 68px ${FONT}`;
	ctx.fillText(`${report.solved}`, qBoxX + 24, heroY + 104);

	ctx.fillStyle = MUTED;
	ctx.font = `700 15px ${FONT}`;
	ctx.fillText('QUESTIONS LOGGED FOR THE DAY', qBoxX + 24, heroY + 128);

	// ─── Daily Graph: 24-Hour Focus Distribution ───
	const graphPanelY = 565;
	const graphPanelH = 350;
	const graphPanelW = W - MARGIN * 2;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
	ctx.lineWidth = 1.5;
	rr(ctx, MARGIN, graphPanelY, graphPanelW, graphPanelH, 22);
	ctx.fill();
	ctx.stroke();

	ctx.textAlign = 'left';
	ctx.fillStyle = INK;
	ctx.font = `800 19px ${FONT}`;
	spaced(ctx, '24-HOUR FOCUS TIMELINE', MARGIN + 28, graphPanelY + 38, 3);

	ctx.textAlign = 'right';
	ctx.fillStyle = MUTED;
	ctx.font = `700 16px ${FONT}`;
	ctx.fillText(`PEAK: ${report.peakHour} · TOTAL: ${report.hours}h`, W - MARGIN - 28, graphPanelY + 38);

	const plotTop = graphPanelY + 80;
	const plotBottom = graphPanelY + 285;
	const plotH = plotBottom - plotTop;
	const maxHourM = Math.max(30, Math.ceil(report.maxHourMinutes * 1.2));

	// Gridlines
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
	ctx.setLineDash([5, 5]);
	ctx.beginPath();
	ctx.moveTo(MARGIN + 28, plotTop);
	ctx.lineTo(W - MARGIN - 28, plotTop);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(MARGIN + 28, plotTop + plotH / 2);
	ctx.lineTo(W - MARGIN - 28, plotTop + plotH / 2);
	ctx.stroke();
	ctx.setLineDash([]);

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
	ctx.beginPath();
	ctx.moveTo(MARGIN + 20, plotBottom);
	ctx.lineTo(W - MARGIN - 20, plotBottom);
	ctx.stroke();

	// 24 Hour Bars
	const barAreaW = graphPanelW - 56;
	const slotW = barAreaW / 24;
	const hBarW = Math.max(16, slotW - 6);

	report.hourDist.forEach((m, h) => {
		const bx = MARGIN + 28 + h * slotW + (slotW - hBarW) / 2;
		const bHeight = m > 0 ? Math.max(6, Math.min(plotH, (m / maxHourM) * plotH)) : 3;

		if (m > 0) {
			const bGrad = ctx.createLinearGradient(0, plotBottom - bHeight, 0, plotBottom);
			bGrad.addColorStop(0, accent);
			bGrad.addColorStop(1, hexToRgba(accent, 0.65));
			ctx.fillStyle = bGrad;
			rr(ctx, bx, plotBottom - bHeight, hBarW, bHeight, 4);
			ctx.fill();

			if (m >= 15 || bHeight >= 40) {
				ctx.textAlign = 'center';
				ctx.fillStyle = '#e2e0ff';
				ctx.font = `800 13px ${FONT}`;
				ctx.fillText(`${m}m`, bx + hBarW / 2, plotBottom - bHeight - 5);
			}
		} else {
			ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
			rr(ctx, bx, plotBottom - 3, hBarW, 3, 1);
			ctx.fill();
		}

		if (h % 3 === 0 || h === 23) {
			const hrLabel = h === 0 ? '12A' : h === 12 ? '12P' : h < 12 ? `${h}A` : `${h - 12}P`;
			ctx.textAlign = 'center';
			ctx.fillStyle = MUTED;
			ctx.font = `700 13px ${FONT}`;
			ctx.fillText(hrLabel, bx + hBarW / 2, plotBottom + 26);
		}
	});

	// ─── Subject Breakdown: Hours & Questions ───
	const subPanelY = 935;
	const subPanelH = 225;
	const subPanelW = W - MARGIN * 2;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
	ctx.lineWidth = 1.5;
	rr(ctx, MARGIN, subPanelY, subPanelW, subPanelH, 22);
	ctx.fill();
	ctx.stroke();

	ctx.textAlign = 'left';
	ctx.fillStyle = INK;
	ctx.font = `800 19px ${FONT}`;
	spaced(ctx, 'SUBJECT BREAKDOWN · TODAY', MARGIN + 28, subPanelY + 38, 3);

	const subColW = (subPanelW - 40) / 3;
	report.subjects.forEach((sub, idx) => {
		const scx = MARGIN + 20 + idx * (subColW + 10);
		ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
		rr(ctx, scx, subPanelY + 54, subColW, 150, 14);
		ctx.fill();
		ctx.stroke();

		// Subject header dot + name
		ctx.fillStyle = sub.color;
		ctx.beginPath();
		ctx.arc(scx + 24, subPanelY + 84, 8, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = INK;
		ctx.font = `800 22px ${FONT}`;
		ctx.textAlign = 'left';
		ctx.fillText(sub.name, scx + 42, subPanelY + 90);

		// Focus hours
		ctx.font = `700 17px ${FONT}`;
		ctx.fillStyle = MUTED;
		ctx.fillText('Focus Time:', scx + 24, subPanelY + 126);
		ctx.fillStyle = '#ffffff';
		ctx.font = `800 20px ${FONT}`;
		ctx.fillText(sub.minutes > 0 ? formatFocus(sub.minutes) : '0m', scx + 130, subPanelY + 126);

		// Questions
		ctx.font = `700 17px ${FONT}`;
		ctx.fillStyle = MUTED;
		ctx.fillText('Questions:', scx + 24, subPanelY + 162);
		ctx.fillStyle = '#10b981';
		ctx.font = `800 20px ${FONT}`;
		ctx.fillText(`${sub.questions} Solved`, scx + 130, subPanelY + 162);
	});

	// Bottom Stat strip
	const statsTop = subPanelY + subPanelH + 20;
	const stats = [
		{ label: 'HOURS TODAY', value: `${report.hours}h` },
		{ label: 'QUESTIONS', value: `${report.solved}` },
		{ label: 'SESSIONS', value: `${report.sessions}` },
		{ label: 'PEAK HOUR', value: report.peakHour },
		{ label: 'STREAK', value: `${report.streak}d` }
	];
	const colWidthStat = (W - MARGIN * 2) / stats.length;
	stats.forEach((stat, index) => {
		const colX = MARGIN + index * colWidthStat;
		ctx.fillStyle = INK;
		ctx.font = `800 36px ${FONT}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(stat.value, colX + colWidthStat / 2, statsTop + 36);
		ctx.fillStyle = MUTED;
		ctx.font = `700 14px ${FONT}`;
		spaced(ctx, stat.label, colX + colWidthStat / 2 - spacedWidth(ctx, stat.label, 4) / 2, statsTop + 64, 4);
	});
	ctx.textAlign = 'left';

	// Footer.
	ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
	ctx.fillRect(MARGIN, H - 96, W - MARGIN * 2, 2);
	ctx.fillStyle = MUTED;
	ctx.font = `italic 600 26px ${FONT}`;
	ctx.fillText('Consistency compounds. Day by day.', MARGIN, H - 44);
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
