<svelte:head><title>Focus · BTracker</title></svelte:head>

<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import StatRing from '$lib/components/StatRing.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import InfoTip from '$lib/components/ui/InfoTip.svelte';
	import DailyActivity from '$lib/components/focus/DailyActivity.svelte';
	import ActivityMap from '$lib/components/focus/ActivityMap.svelte';
	import StudyAnalysis from '$lib/components/focus/StudyAnalysis.svelte';
	import SubjectLeaderboard from '$lib/components/focus/SubjectLeaderboard.svelte';
	import WeeklyReportCard from '$lib/components/focus/WeeklyReportCard.svelte';
	import StopwatchReportModal from '$lib/components/focus/StopwatchReportModal.svelte';
	import DeepWorkMode from '$lib/components/focus/DeepWorkMode.svelte';
	import AnimatedNumber from '$lib/components/ui/AnimatedNumber.svelte';
	import {
		tracker, updateTracker, recordFocus, logManualMinutes, addSubjectSession, stopwatchReports,
		weeklyFocusMinutes, peakProductivity, subjectHealth, setWeeklyGoalHours, setStreakGoalHours,
		celebration, type StopwatchReport
	} from '$lib/stores/tracker';
	import { addDaysKey, focusMinutesOn, formatClock, formatMinutes, lastNDays, sessionDayKey, todayKey } from '$lib/state/dates';
	import { SUBJECTS, chaptersOf, subjectColor, subjectName } from '$lib/state/subjects';
	import { playChime } from '$lib/services/chime';

	type Tab = 'focus' | 'stopwatch' | 'short' | 'long';
	const TABS: { id: Tab; label: string }[] = [
		{ id: 'focus', label: 'FOCUS' }, { id: 'stopwatch', label: 'STOPWATCH' },
		{ id: 'short', label: 'SHORT' }, { id: 'long', label: 'LONG' }
	];

	let tab: Tab = 'focus';
	let subject: string | null = null;
	let focusLen = 25; let shortLen = 5; let longLen = 15;
	let customOpen = false; let customValue = 25;
	let deepWorkMode = false;

	let running = false;
	let phase: 'focus' | 'break' = 'focus';
	let remaining = focusLen * 60;
	let elapsed = 0;
	let countdownEndsAt: number | null = null;
	let countUpStartedAt: number | null = null;
	let sessionStartedEpochMin = 0;
	let interval: ReturnType<typeof setInterval> | undefined;

	let swKind: 'questions' | 'theory' | 'revision' = 'questions';
	let focusKind: 'questions' | 'theory' | 'revision' = 'questions';
	let swChapter = '';
	let report: StopwatchReport | null = null;
	let reportOpen = false;
	let reportsOpen = false;

	let logOpen = false; let logMinutes = 30; let logSubject: string | null = null;
	let focusChapter = '';
	import { boostChapterFromPractice } from '$lib/stores/recall-actions'; let logChapter = '';
	let milestoneOpen = false; let milestoneHours = $tracker.meta.weekGoalH;

	let locked = false; 
	let touchStartX = 0;
	let touchEndX = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.changedTouches[0].screenX;
	}

	function handleTouchEnd(e: TouchEvent) {
		touchEndX = e.changedTouches[0].screenX;
		handleSwipe();
	}

	function handleSwipe() {
		const threshold = 50;
		const diff = touchEndX - touchStartX;
		if (Math.abs(diff) < threshold) return;
		
		const currentIndex = TABS.findIndex(t => t.id === tab);
		if (diff < 0 && currentIndex < TABS.length - 1) {
			// Swipe left -> next tab
			switchTab(TABS[currentIndex + 1].id);
		} else if (diff > 0 && currentIndex > 0) {
			// Swipe right -> prev tab
			switchTab(TABS[currentIndex - 1].id);
		}
	}
  
	let showSettings = false; let ambientOn = false;
	let ambient: { ctx: AudioContext; src: AudioBufferSourceNode } | null = null;
	let clock = new Date();
	const clockTimer = setInterval(() => (clock = new Date()), 1000);

	$: pom = $tracker.pom;
	$: presets = tab === 'focus' ? [25, 45, 60] : tab === 'short' ? [5, 10, 15] : tab === 'long' ? [15, 20, 30] : [];
	$: activeLen = tab === 'focus' ? focusLen : tab === 'short' ? shortLen : longLen;
	$: ringProgress = tab === 'stopwatch' ? (elapsed % 3600) / 3600 : activeLen * 60 > 0 ? 1 - remaining / (activeLen * 60) : 0;
	$: dialTime = tab === 'stopwatch' ? formatClock(elapsed) : formatClock(remaining);
	$: accent = tab === 'short' ? '#2f9e6e' : tab === 'long' ? '#2b8ba6' : 'var(--accent)';
	$: chapters = chaptersOf(subject);
	$: logChapters = chaptersOf(logSubject);
	$: if (focusChapter && !chapters.includes(focusChapter)) focusChapter = '';
	$: if (logChapter && !logChapters.includes(logChapter)) logChapter = '';
	$: swValid = Boolean(subject) && (swKind === 'theory' || Boolean(swChapter));
	$: weekKeys = new Set(lastNDays(7));
	$: weekSessions = $tracker.log.filter((session) => weekKeys.has(sessionDayKey(session))).length;
	$: hourStreak = (() => {
		let n = 0; let key = todayKey();
		if (focusMinutesOn($tracker.log, key) < 60) key = addDaysKey(key, -1);
		while (focusMinutesOn($tracker.log, key) >= 60) { n += 1; key = addDaysKey(key, -1); }
		return n;
	})();
	$: weekGoalH = $tracker.meta.weekGoalH;
	$: goalPct = weekGoalH > 0 ? Math.min(100, Math.round(($weeklyFocusMinutes / (weekGoalH * 60)) * 100)) : 0;
	$: clockTime = clock.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
	$: clockDate = clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

	function shouldChime(kind: 'focus' | 'break') {
		if (pom.chime === 'both') return true;
		if (pom.chime === 'none') return false;
		return pom.chime === kind;
	}

	function startTicking() { clearInterval(interval); interval = setInterval(tick, 250); }

	function tick() {
		const nowMs = Date.now();
		if (tab === 'stopwatch') {
			if (countUpStartedAt != null) elapsed = Math.round((nowMs - countUpStartedAt) / 1000);
			return;
		}
		if (countdownEndsAt != null) {
			remaining = Math.max(0, Math.round((countdownEndsAt - nowMs) / 1000));
			if (remaining === 0) onCountdownComplete();
		}
	}

	function beginCountdown(seconds: number) {
		remaining = seconds;
		countdownEndsAt = Date.now() + seconds * 1000;
		running = true;
		startTicking();
	}

	function logSession(minutes: number, activity: string) {
		if (focusKind === 'revision' && subject && focusChapter) {
			boostChapterFromPractice(`${subject}-${focusChapter}`);
		}
		recordFocus({
			startedEpochMinutes: sessionStartedEpochMin || Math.floor(Date.now() / 60000) - minutes,
			durationMinutes: minutes, activity, deadlineId: null, subject, chapter: focusChapter || undefined
		});
		celebration.set(`${minutes} min focus logged!`);
	}

	function onCountdownComplete() {
		clearInterval(interval); running = false; countdownEndsAt = null;
		if (tab === 'focus' && phase === 'focus') {
			logSession(focusLen, focusKind === 'questions' ? 'Focus · Questions' : focusKind === 'revision' ? 'Focus · Revision' : 'Focus · Theory');
			if (shouldChime('focus')) playChime('up');
			phase = 'break'; remaining = shortLen * 60;
			if (pom.autoBrk) beginCountdown(shortLen * 60);
		} else if (tab === 'focus' && phase === 'break') {
			if (shouldChime('break')) playChime('down');
			phase = 'focus'; remaining = focusLen * 60;
			if (pom.autoFocus) beginCountdown(focusLen * 60);
		} else {
			if (shouldChime('break')) playChime('down');
			celebration.set(tab === 'short' ? 'Short break done!' : 'Long break done!');
			remaining = activeLen * 60;
		}
	}

	function primary() {
		if (locked) return;
		if (tab === 'stopwatch') {
			if (running) { running = false; clearInterval(interval); countUpStartedAt = null; }
			else {
				sessionStartedEpochMin = sessionStartedEpochMin || Math.floor(Date.now() / 60000);
				countUpStartedAt = Date.now() - elapsed * 1000;
				running = true; startTicking();
			}
			return;
		}
		if (running) { running = false; clearInterval(interval); countdownEndsAt = null; return; }
		sessionStartedEpochMin = Math.floor(Date.now() / 60000);
		if (remaining <= 0) remaining = activeLen * 60;
		beginCountdown(remaining);
	}

	function stopSession() {
		clearInterval(interval); running = false; countdownEndsAt = null; countUpStartedAt = null;
		if (tab === 'stopwatch') {
			if (elapsed >= 1) {
				report = { sub: subject ?? 'X', kind: swKind, at: Date.now(), seconds: elapsed, done: 0, correct: 0, mistakes: 0 };
				reportOpen = true;
			}
			elapsed = 0; sessionStartedEpochMin = 0;
			return;
		}
		const doneMinutes = Math.round(((activeLen * 60) - remaining) / 60);
		if (tab === 'focus' && phase === 'focus' && doneMinutes >= 1) logSession(doneMinutes, focusKind === 'questions' ? 'Focus · Questions' : focusKind === 'revision' ? 'Focus · Revision' : 'Focus · Theory');
		reset();
	}

	function reset() {
		clearInterval(interval); running = false; countdownEndsAt = null; countUpStartedAt = null;
		sessionStartedEpochMin = 0; phase = 'focus'; remaining = activeLen * 60; elapsed = 0;
	}

	function switchTab(next: Tab) {
		if (next === tab) return;
		reset();
		tab = next;
		remaining = (next === 'focus' ? focusLen : next === 'short' ? shortLen : longLen) * 60;
	}

	function pickPreset(minutes: number) {
		if (running || locked) return;
		if (tab === 'focus') focusLen = minutes; else if (tab === 'short') shortLen = minutes; else longLen = minutes;
		remaining = minutes * 60;
		customOpen = false;
	}

	function applyCustom() {
		const minutes = Math.max(1, Math.min(240, Number(customValue) || 1));
		customValue = minutes;
		pickPreset(minutes);
	}

	function skipBreak() {
		clearInterval(interval); running = false; countdownEndsAt = null;
		phase = 'focus'; remaining = focusLen * 60;
	}

	function onSaveReport(event: CustomEvent<StopwatchReport>) {
		const savedReport = event.detail;
		stopwatchReports.update((list) => [savedReport, ...list]);
		if (savedReport.kind === 'revision' && savedReport.sub && swChapter) {
			boostChapterFromPractice(`${savedReport.sub}-${swChapter}`);
		}
		recordFocus({
			startedEpochMinutes: sessionStartedEpochMin || Math.floor(savedReport.at / 60000),
			durationMinutes: Math.max(1, Math.round(savedReport.seconds / 60)),
			activity: savedReport.kind === 'questions' ? 'Stopwatch · Questions' : savedReport.kind === 'revision' ? 'Stopwatch · Revision' : 'Stopwatch · Theory',
			deadlineId: null, subject: savedReport.sub, chapter: swChapter || undefined
		});
		if (savedReport.kind === 'questions' && savedReport.done > 0 && savedReport.sub !== 'X') {
			addSubjectSession({ sub: savedReport.sub, ch: swChapter || 'General', att: savedReport.done, cor: Math.min(savedReport.correct, savedReport.done) });
		}
		sessionStartedEpochMin = 0; swChapter = '';
	}

	function submitLog() {
		const minutes = Math.max(1, Math.round(Number(logMinutes) || 0));
		logManualMinutes(minutes, logSubject, logChapter || undefined);
		if (logSubject && logChapter) {
			boostChapterFromPractice(`${logSubject}-${logChapter}`);
		}
		celebration.set(`${minutes} min logged!`);
		logOpen = false;
	}

	async function share() {
		const weekHours = $weeklyFocusMinutes / 60;
		const totalQ = (() => {
			let n = 0;
			for (const day of Object.values($tracker.stat)) for (const v of Object.values(day ?? {})) n += Number(v) || 0;
			return n;
		})();

		// 500×625 portrait widget, 2x retina
		const W = 500, H = 625;
		const canvas = document.createElement('canvas');
		canvas.width = W * 2; canvas.height = H * 2;
		const ctx = canvas.getContext('2d')!;
		ctx.scale(2, 2);

		// ── Background ──────────────────────────────────────────────
		const bg = ctx.createLinearGradient(0, 0, 0, H);
		bg.addColorStop(0, '#0f0f1a'); bg.addColorStop(1, '#080810');
		ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

		// Rounded clip
		ctx.save(); ctx.beginPath(); (ctx as any).roundRect(0, 0, W, H, 28); ctx.clip();

		// Glow orbs
		const glow = (x: number, y: number, r: number, c: string) => {
			const g = ctx.createRadialGradient(x, y, 0, x, y, r);
			g.addColorStop(0, c); g.addColorStop(1, 'transparent');
			ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
		};
		glow(W / 2, 200, 260, 'rgba(109,93,252,0.14)');
		glow(W / 2, 480, 200, 'rgba(16,185,129,0.12)');

		// Top accent bar
		const al = ctx.createLinearGradient(0, 0, W, 0);
		al.addColorStop(0, 'transparent'); al.addColorStop(0.35, '#6d5dfc');
		al.addColorStop(0.65, '#f59e0b'); al.addColorStop(1, 'transparent');
		ctx.fillStyle = al; ctx.fillRect(0, 0, W, 3);

		// ── Brand header ─────────────────────────────────────────────
		ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = 'bold 13px system-ui,sans-serif';
		ctx.fillText('B T R A C K E R', W / 2, 38);
		ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '10px system-ui';
		ctx.fillText('WEEKLY SNAPSHOT', W / 2, 56);

		// ── TOP: Speedometer ─────────────────────────────────────────
		const cx = W / 2, cy = 210, R = 130;
		const startAngle = Math.PI * 0.75;   // 225°
		const endAngle   = Math.PI * 2.25;   // 405° (45°)
		const maxH = 10;
		const pct = Math.min(1, weekHours / maxH);
		const needleAngle = startAngle + pct * (endAngle - startAngle);

		// Track bg
		ctx.beginPath(); ctx.arc(cx, cy, R, startAngle, endAngle);
		ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();

		// Filled arc purple → amber
		if (pct > 0) {
			ctx.beginPath(); ctx.arc(cx, cy, R, startAngle, needleAngle);
			const fg = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
			fg.addColorStop(0, '#6d5dfc'); fg.addColorStop(0.5, '#a855f7'); fg.addColorStop(1, '#f59e0b');
			ctx.strokeStyle = fg; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.stroke();
			// Tip glow
			const tx = cx + R * Math.cos(needleAngle), ty = cy + R * Math.sin(needleAngle);
			const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 22);
			tg.addColorStop(0, 'rgba(245,158,11,0.6)'); tg.addColorStop(1, 'transparent');
			ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, 22, 0, Math.PI * 2); ctx.fill();
		}

		// Centre hub
		ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
		ctx.fillStyle = '#1a1a2e'; ctx.fill();
		ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5; ctx.stroke();

		// Value inside arc
		ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = '#ffffff'; ctx.font = 'bold 52px ui-monospace,monospace';
		ctx.fillText(weekHours.toFixed(1), cx, cy - 8);
		ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = 'bold 11px system-ui';
		ctx.fillText('HOURS THIS WEEK', cx, cy + 18);

		// ── Horizontal divider ────────────────────────────────────────
		const divY = 348;
		const div = ctx.createLinearGradient(0, 0, W, 0);
		div.addColorStop(0, 'transparent'); div.addColorStop(0.5, 'rgba(255,255,255,0.1)'); div.addColorStop(1, 'transparent');
		ctx.strokeStyle = div; ctx.lineWidth = 1;
		ctx.beginPath(); ctx.moveTo(40, divY); ctx.lineTo(W - 40, divY); ctx.stroke();

		// ── BOTTOM: Questions ring ────────────────────────────────────
		const qcx = W / 2, qcy = 490, qR = 100;

		// Section label
		ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = '700 10px system-ui';
		ctx.fillText('QUESTIONS SOLVED', qcx, 376);

		// Track
		ctx.beginPath(); ctx.arc(qcx, qcy, qR, 0, Math.PI * 2);
		ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 14; ctx.lineCap = 'butt'; ctx.stroke();

		// Fill ring
		const milestone = Math.max(100, Math.ceil((totalQ + 1) / 100) * 100);
		const qPct = Math.min(1, totalQ / milestone);
		if (qPct > 0) {
			ctx.beginPath(); ctx.arc(qcx, qcy, qR, -Math.PI / 2, -Math.PI / 2 + qPct * Math.PI * 2);
			const qg = ctx.createLinearGradient(qcx - qR, qcy, qcx + qR, qcy);
			qg.addColorStop(0, '#10b981'); qg.addColorStop(1, '#34d399');
			ctx.strokeStyle = qg; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.stroke();
			// Tip glow
			const qa = -Math.PI / 2 + qPct * Math.PI * 2;
			const qgx = qcx + qR * Math.cos(qa), qgy = qcy + qR * Math.sin(qa);
			const qtgl = ctx.createRadialGradient(qgx, qgy, 0, qgx, qgy, 18);
			qtgl.addColorStop(0, 'rgba(52,211,153,0.65)'); qtgl.addColorStop(1, 'transparent');
			ctx.fillStyle = qtgl; ctx.beginPath(); ctx.arc(qgx, qgy, 18, 0, Math.PI * 2); ctx.fill();
		}

		// Number + label inside ring
		ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = '#ffffff'; ctx.font = `bold ${totalQ > 9999 ? '34' : '44'}px ui-monospace,monospace`;
		ctx.fillText(totalQ.toLocaleString(), qcx, qcy + 16);
		ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = 'bold 10px system-ui';
		ctx.fillText('QUESTIONS', qcx, qcy + 36);
		ctx.fillStyle = 'rgba(52,211,153,0.65)'; ctx.font = '9px system-ui';
		ctx.fillText(`${Math.round(qPct * 100)}% to ${milestone.toLocaleString()}`, qcx, qcy + 54);

		// ── Footer ───────────────────────────────────────────────────
		ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.font = '9px system-ui';
		ctx.textAlign = 'center'; ctx.fillText('BTRACKER · Your JEE Study OS', W / 2, H - 16);

		ctx.restore();

		const a = document.createElement('a');
		a.download = 'btracker-widget.png'; a.href = canvas.toDataURL('image/png'); a.click();
		celebration.set('Widget exported! 🎉');
	}
	function toggleAmbient() {
		if (ambientOn) {
			try { ambient?.src.stop(); ambient?.ctx.close(); } catch { /* already stopped */ }
			ambient = null; ambientOn = false;
			return;
		}
		try {
			const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			const ctx = new Ctor();
			const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
			const data = buffer.getChannelData(0);
			let last = 0;
			for (let i = 0; i < data.length; i++) { const white = Math.random() * 2 - 1; last = (last + 0.02 * white) / 1.02; data[i] = last * 3; }
			const src = ctx.createBufferSource();
			src.buffer = buffer; src.loop = true;
			const gain = ctx.createGain(); gain.gain.value = 0.06;
			src.connect(gain).connect(ctx.destination);
			src.start();
			ambient = { ctx, src }; ambientOn = true;
		} catch { ambientOn = false; }
	}

	function toggleFullscreen() {
		if (document.fullscreenElement) void document.exitFullscreen();
		else void document.documentElement.requestFullscreen().catch(() => {});
	}

	onDestroy(() => { clearInterval(interval); clearInterval(clockTimer); try { ambient?.src.stop(); } catch { /* noop */ } });
</script>

<section class="focus" in:fade={{ duration: 260 }}>
	<header class="page-head">
		<div class="titles">
			<h1>Focus &amp; Analytics <a class="palette" href="/settings" title="Theme & colors"><NavIcon name="palette" size={15} /></a></h1>
			<p>Deep work timers, stopwatch sessions and focus analytics.</p>
		</div>
		<div class="clockbox">
			<b>{clockTime}</b>
			<span>{clockDate}</span>
		</div>
	</header>

	<div class="toolbar">
		<button type="button" class="tb" on:click={share}><NavIcon name="share" size={14} /> SHARE</button>
		<button type="button" class="tb accent" on:click={() => (logOpen = true)}><NavIcon name="plus" size={14} /> LOG</button>
		<button type="button" class="tb" class:on={deepWorkMode} on:click={() => (deepWorkMode = !deepWorkMode)}><NavIcon name="expand" size={14} /> DEEP WORK</button>
		{#if tab === 'stopwatch'}
			<button type="button" class="tb" on:click={() => (reportsOpen = true)}><NavIcon name="history" size={14} /> REPORTS</button>
		{/if}
		<span class="spacer"></span>
		<button type="button" class="ic" class:on={ambientOn} title="Ambient noise" on:click={toggleAmbient}><NavIcon name="headphones" size={15} /></button>
		<button type="button" class="ic" title="Full screen" on:click={toggleFullscreen}><NavIcon name="expand" size={15} /></button>
		<button type="button" class="ic" class:on={locked} title={locked ? 'Unlock controls' : 'Lock controls'} on:click={() => (locked = !locked)}><NavIcon name="lock" size={15} /></button>
		<button type="button" class="ic" class:on={showSettings} title="Timer settings" on:click={() => (showSettings = !showSettings)}><NavIcon name="sliders" size={15} /></button>
	</div>

	<div class="tabs" role="tablist">
		{#each TABS as t}
			<button type="button" role="tab" class="tab" class:active={tab === t.id} class:green={t.id === 'short'} class:blue={t.id === 'long'} aria-selected={tab === t.id} on:click={() => switchTab(t.id)}>{t.label}</button>
		{/each}
	</div>

	<div class="layout" on:touchstart={handleTouchStart} on:touchend={handleTouchEnd}>
		<div class="stage card" in:fly={{ y: 10, duration: 260 }}>
			{#if showSettings}
				<div class="settings" in:fly={{ y: -6, duration: 200 }}>
					<label class="field"><span>Chime</span>
						<select value={pom.chime} on:change={(e) => { const v = e.currentTarget.value as typeof pom.chime; updateTracker((s) => { s.pom.chime = v; }); }}>
							<option value="both">Focus & break</option><option value="focus">Focus only</option>
							<option value="break">Break only</option><option value="none">Silent</option>
						</select>
					</label>
					<label class="check"><input type="checkbox" checked={pom.autoBrk} on:change={(e) => { const v = e.currentTarget.checked; updateTracker((s) => { s.pom.autoBrk = v; }); }} /><span>Auto-start breaks</span></label>
					<label class="check"><input type="checkbox" checked={pom.autoFocus} on:change={(e) => { const v = e.currentTarget.checked; updateTracker((s) => { s.pom.autoFocus = v; }); }} /><span>Auto-start next focus</span></label>
				</div>
			{/if}

			{#if tab === 'stopwatch'}
				<div class="sw-setup" class:hidden={running || elapsed > 0}>
					<p class="label">SESSION TYPE</p>
					<div class="kinds">
						<button type="button" class="kind amber" class:on={swKind === 'questions'} disabled={locked} on:click={() => (swKind = 'questions')}>QUESTIONS</button>
						<button type="button" class="kind" class:on={swKind === 'theory'} disabled={locked} on:click={() => (swKind = 'theory')}>THEORY</button>
							<button type="button" class="kind green" class:on={swKind === 'revision'} disabled={locked} style="background: var(--success); color: white;" on:click={() => (swKind = 'revision')}>REVISION</button>
					</div>
					<p class="label">SELECT SUBJECT</p>
					<div class="chips">
						{#each SUBJECTS as s}
							<button type="button" class="chip" class:on={subject === s.code} disabled={locked} style="--c: {s.color}" on:click={() => { subject = subject === s.code ? null : s.code; swChapter = ''; }}>
								<span class="dot" style="background: {s.color}"></span>{s.name}
							</button>
						{/each}
					</div>
					<p class="label">CHAPTER{swKind === 'questions' ? ' *' : ''}</p>
					<select class="chapter" bind:value={swChapter} disabled={locked || !subject}>
						<option value="">{subject ? 'Select a chapter…' : 'Select a subject first'}</option>
						{#each chapters as ch}<option value={ch}>{ch}</option>{/each}
					</select>
					{#if swKind === 'questions' && !swChapter}
						<p class="hint">Please select a chapter to start.</p>
					{/if}
					<div class="policy">
						<NavIcon name="shield" size={15} />
						<span><b>Strict Policy:</b> Stopwatch sessions will NOT persist if the tab is closed or refreshed. Use Focus mode for persistence.</span>
					</div>
				</div>
			{:else if !running && phase === 'focus' && !locked}
				<div class="presets">
					<p class="label">{tab === 'focus' ? 'FOCUS LENGTH' : tab === 'short' ? 'SHORT BREAK' : 'LONG BREAK'}</p>
					<div class="preset-row">
						{#each presets as minutes}
							<button type="button" class="preset" class:on={activeLen === minutes && !customOpen} on:click={() => pickPreset(minutes)}>{minutes} min</button>
						{/each}
						<button type="button" class="preset" class:on={customOpen} on:click={() => (customOpen = !customOpen)}>Custom</button>
						{#if customOpen}
							<span class="custom"><input type="number" min="1" max="240" bind:value={customValue} /> <button type="button" on:click={applyCustom}>Set</button></span>
						{/if}
					</div>
					{#if tab === 'focus'}
						<p class="label">SELECT SUBJECT</p>
						<div class="chips">
							{#each SUBJECTS as s}
								<button type="button" class="chip" class:on={subject === s.code} style="--c: {s.color}" on:click={() => (subject = subject === s.code ? null : s.code)}>
									<span class="dot" style="background: {s.color}"></span>{s.name}
								</button>
							{/each}
						</div>
						<p class="label">CHAPTER</p>
						<select class="chapter" bind:value={focusChapter} disabled={!subject}>
							<option value="">{subject ? 'Select a chapter…' : 'Select a subject first'}</option>
							{#each chapters as ch}<option value={ch}>{ch}</option>{/each}
						</select>
					{/if}
				</div>
			{/if}

			{#if tab === 'focus' && phase === 'break' && !running && remaining === shortLen * 60}
				<div class="breather">
					<span class="bicon"><NavIcon name="coffee" size={18} /></span>
					<span class="bicon alt"><NavIcon name="sofa" size={18} /></span>
					<p>Take a breather. You earned it.</p>
				</div>
			{/if}

			<div class="dial" class:break={phase === 'break' && tab === 'focus'}>
				<StatRing value={ringProgress} size={280} stroke={16} color={phase === 'break' && tab === 'focus' ? 'var(--success, #2f9e6e)' : accent}>
					{#if running && tab !== 'stopwatch'}<span class="state-pill">{phase === 'break' ? 'ON BREAK' : 'FOCUSING'}</span>{/if}
					{#if tab === 'stopwatch' && !running && elapsed === 0}
						<span class="state-pill amber">⚡ COUNTS UP INFINITE</span>
					{/if}
					<span class="time">{dialTime}</span>
					<span class="dial-label">
						{#if tab === 'stopwatch'}
							{swKind === 'theory' && running ? 'Theory mode active' : subject ? `On ${subjectName(subject)}` : 'No subject selected'}
						{:else if phase === 'break'}break time
						{:else}{subject ? `On ${subjectName(subject)}` : 'General focus'}
						{/if}
					</span>
				</StatRing>
			</div>

			{#if tab === 'stopwatch' && swKind === 'theory' && running}
				<div class="theory-card">
					<b>THEORY MODE ACTIVE</b>
					<span>Time is being tracked. No question pressure — just read and absorb.</span>
				</div>
			{/if}

			<div class="controls">
				{#if tab === 'stopwatch'}
					<button type="button" class="primary amber" disabled={!running && !swValid} on:click={primary}>{running ? 'Pause' : elapsed ? 'Resume' : 'Start'}</button>
					<button type="button" class="stop" disabled={!running && elapsed === 0} on:click={stopSession}><NavIcon name="stop" size={14} /> Stop</button>
					<button type="button" class="ghost" disabled={running} on:click={reset}>Reset</button>
				{:else}
					<button type="button" class="primary" style="--btn: {accent}" on:click={primary}>{running ? 'Pause' : 'Start'}</button>
					{#if running || remaining !== activeLen * 60}
						<button type="button" class="stop" on:click={stopSession}><NavIcon name="stop" size={14} /> Stop</button>
					{/if}
					{#if tab === 'focus' && phase === 'break'}
						<button type="button" class="ghost" on:click={skipBreak}>Skip break</button>
					{:else}
					<button type="button" class="ghost" on:click={reset}>Reset</button>
					{/if}
				{/if}
			</div>
		</div>

		<div class="side">
			<div class="stat-grid">
				<div class="stat card">
					<span class="k">WEEKLY TOTAL <InfoTip text="TOTAL TIME SPENT IN FOCUS SESSIONS FOR THE SELECTED PERIOD." /></span>
					<b><AnimatedNumber value={$weeklyFocusMinutes} format={formatMinutes} /></b>
				</div>
				<div class="stat card">
					<span class="k">COMPLETED SESSIONS <InfoTip text="FOCUS SESSIONS COMPLETED IN THE LAST 7 DAYS." /></span>
					<b>{weekSessions}</b>
				</div>
				<div class="stat card">
					<span class="k">MIN 1H DAILY <InfoTip text="DAYS IN A ROW YOU'VE FOCUSED FOR AT LEAST 1 HOUR. KEEP IT UP!" /></span>
					<b>{hourStreak}<small>Days</small></b>
					<span class="sub">CURRENT STREAK</span>
				</div>
				<div class="stat card">
					<span class="k">STREAK GOAL <InfoTip text="Minimum hours per day to keep your streak alive." /></span>
					<b>{$tracker.meta.streakGoalH}h<small>/ day</small></b>
					{#if !locked}
						<span class="goal-edit">
							<button type="button" on:click={() => setStreakGoalHours($tracker.meta.streakGoalH - 1)}>−</button>
							<button type="button" on:click={() => setStreakGoalHours($tracker.meta.streakGoalH + 1)}>+</button>
						</span>
					{:else}
						<span class="sub"><NavIcon name="lock" size={11} /> LOCKED</span>
					{/if}
				</div>
			</div>

			<div class="card peak">
				<span class="picon"><NavIcon name="sunrise" size={16} /></span>
				<div>
					<span class="k">PEAK PRODUCTIVITY</span>
					{#if $peakProductivity.has}
						<b>{$peakProductivity.label}</b>
						<span class="sub">{$peakProductivity.pct}% OF FOCUS</span>
					{:else}
						<b>—</b><span class="sub">Log sessions to find your peak</span>
					{/if}
				</div>
			</div>

			<div class="card health">
				<span class="k">SUBJECT HEALTH</span>
				<ul>
					{#each $subjectHealth as entry (entry.code)}
						<li>
							<span class="dot" style="background: {entry.color}"></span>
							<b>{entry.name}</b>
							<span class="badge" class:fresh={entry.badge === 'JUST NOW'} class:stale={entry.badge === 'NEVER'}>{entry.badge}</span>
						</li>
					{/each}
				</ul>
			</div>

			<div class="card goal">
				<div class="goal-head">
					<span>WEEKLY GOAL: {weekGoalH}H</span>
					<b>{goalPct}% COMPLETE</b>
				</div>
				<div class="bar"><div class="fill" style="width: {goalPct}%"></div></div>
				<div class="goal-foot">
					<span>{($weeklyFocusMinutes / 60).toFixed(1)}H THIS WEEK</span>
					<button type="button" class="sliders-btn" on:click={() => { milestoneHours = weekGoalH; milestoneOpen = true; }}><NavIcon name="sliders" size={13} /> Edit</button>
				</div>
			</div>
		</div>
	</div>

	<div class="analytics">
		<DailyActivity />
		<ActivityMap />
		<StudyAnalysis />
		<SubjectLeaderboard />
		<WeeklyReportCard />
	</div>
</section>

<StopwatchReportModal bind:open={reportOpen} {report} on:save={onSaveReport} />

<Modal bind:open={reportsOpen} title="STOPWATCH REPORTS" width="480px">
	{#if $stopwatchReports.length}
		<ul class="report-list">
			{#each $stopwatchReports as entry, i (i)}
				<li>
					<span class="dot" style="background: {subjectColor(entry.sub)}"></span>
					<div class="rl-main">
						<b>{subjectName(entry.sub)} · {entry.kind === 'questions' ? 'Questions' : 'Theory'}</b>
						<span>{new Date(entry.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — {Math.floor(entry.seconds / 60)}m {entry.seconds % 60}s</span>
					</div>
					<div class="rl-nums">
						<span>{entry.done ? Math.round((entry.correct / entry.done) * 100) : 0}% acc</span>
						<b>{entry.done}/{entry.correct}/{entry.mistakes}</b>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty-note">No stopwatch reports yet this session.</p>
	{/if}
</Modal>

<Modal bind:open={logOpen} title="LOG FOCUS TIME" width="400px">
	<label class="field"><span>Minutes</span><input type="number" min="1" max="1440" bind:value={logMinutes} /></label>
	<label class="field"><span>Subject</span>
		<select bind:value={logSubject}>
			<option value={null}>No subject</option>
			{#each SUBJECTS as s}<option value={s.code}>{s.name}</option>{/each}
		</select>
	</label>
	{#if logSubject}
		<label class="field"><span>Chapter</span>
			<select bind:value={logChapter}>
				<option value="">Optional…</option>
				{#each logChapters as ch}<option value={ch}>{ch}</option>{/each}
			</select>
		</label>
	{/if}
	<svelte:fragment slot="footer">
		<button type="button" class="btn ghost" on:click={() => (logOpen = false)}>Cancel</button>
		<button type="button" class="btn solid" on:click={submitLog}>Log time</button>
	</svelte:fragment>
</Modal>

<Modal bind:open={milestoneOpen} title="TARGET MILESTONE" width="400px">
	<label class="field"><span>Set Hours</span><input type="number" min="1" max="500" bind:value={milestoneHours} /></label>
	<div class="bump-row">
		<button type="button" class="bump" on:click={() => (milestoneHours += 10)}>+10h</button>
		<button type="button" class="bump" on:click={() => (milestoneHours += 50)}>+50h</button>
		<button type="button" class="bump" on:click={() => (milestoneHours += 100)}>+100h</button>
	</div>
	<svelte:fragment slot="footer">
		<button type="button" class="btn ghost" on:click={() => (milestoneOpen = false)}>CANCEL</button>
		<button type="button" class="btn solid" on:click={() => { setWeeklyGoalHours(Number(milestoneHours)); milestoneOpen = false; }}>SAVE GOAL</button>
	</svelte:fragment>
</Modal>

{#if deepWorkMode}
	<DeepWorkMode
		{running}
		{dialTime}
		{ringProgress}
		{phase}
		subject={subject ? subjectName(subject) : null}
		chapter={tab === 'stopwatch' ? swChapter : focusChapter}
		focusKind={tab === 'stopwatch' ? swKind : focusKind}
		{accent}
		on:start={primary}
		on:pause={primary}
		on:exit={() => (deepWorkMode = false)}
	/>
{/if}

<style>
	.focus { display: grid; gap: 1.2rem; }
	.page-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	.titles h1 { display: flex; align-items: center; gap: .55rem; margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em; }
	.palette { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid var(--border-subtle); border-radius: 10px; color: var(--accent); background: var(--accent-soft); }
	.titles p { margin: .3rem 0 0; color: var(--text-secondary); font-size: .82rem; }
	.clockbox { display: flex; flex-direction: column; align-items: flex-end; gap: .2rem; }
	.clockbox b { font-size: 1.25rem; font-weight: 800; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
	.clockbox span { color: var(--text-secondary); font-size: .7rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }

	.toolbar { display: flex; align-items: center; gap: .45rem; flex-wrap: wrap; }
	.tb { display: inline-flex; align-items: center; gap: .4rem; padding: .5rem .85rem; border: 1px solid var(--border-subtle); border-radius: 10px; color: var(--text-secondary); background: var(--surface-panel); font-size: .7rem; font-weight: 800; letter-spacing: .06em; }
	.tb:hover { color: var(--accent); border-color: var(--accent); }
	.tb.accent { color: var(--accent); border-color: color-mix(in srgb, var(--accent), transparent 60%); background: var(--accent-soft); }
	.tb.on { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
	.spacer { flex: 1; }
	.ic { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--border-subtle); border-radius: 10px; color: var(--text-secondary); background: var(--surface-panel); }
	.ic:hover, .ic.on { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }

	.tabs { display: inline-flex; gap: .25rem; padding: .3rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-panel); width: fit-content; }
	.tab { padding: .55rem 1.15rem; border: 0; border-radius: 999px; background: transparent; color: var(--text-secondary); font-size: .74rem; font-weight: 800; letter-spacing: .07em; }
	.tab.active { color: #fff; background: var(--accent); }
	.tab.green.active { background: #2f9e6e; }
	.tab.blue.active { background: #2b8ba6; }

	.layout { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 1.2rem; align-items: start; }
	.card { padding: 1.3rem 1.4rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); background: var(--surface-panel); box-shadow: var(--shadow-card); }
	.stage { display: grid; justify-items: center; gap: 1.05rem; text-align: center; }

	.settings { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .8rem; width: 100%; padding: .9rem 1rem; border: 1px dashed var(--border-subtle); border-radius: 14px; background: var(--surface-canvas); text-align: left; }
	.field { display: grid; gap: .3rem; }
	.field span { color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
	.field input, .field select, .chapter { padding: .55rem .65rem; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--surface-panel); color: var(--text-primary); font-size: .82rem; width: 100%; }
	.check { display: flex; align-items: center; gap: .5rem; font-size: .8rem; }
	.check input { width: 16px; height: 16px; accent-color: var(--accent); }

	.label { margin: 0 0 .45rem; color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .1em; }
	.presets, .sw-setup { display: grid; gap: .8rem; width: 100%; max-width: 460px; }
	.sw-setup.hidden { display: none; }
	.preset-row { display: flex; gap: .45rem; flex-wrap: wrap; justify-content: center; }
	.preset { padding: .48rem .95rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-panel); color: var(--text-secondary); font-size: .76rem; font-weight: 750; }
	.preset:hover { border-color: var(--accent); color: var(--accent); }
	.preset.on { color: #fff; border-color: var(--accent); background: var(--accent); }
	.custom { display: inline-flex; align-items: center; gap: .35rem; }
	.custom input { width: 64px; padding: .45rem .5rem; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-panel); color: var(--text-primary); }
	.custom button { padding: .45rem .7rem; border: 1px solid var(--accent); border-radius: 9px; color: var(--accent); background: var(--accent-soft); font-weight: 750; font-size: .74rem; }
	.chips { display: flex; gap: .45rem; flex-wrap: wrap; justify-content: center; }
	.chip { display: inline-flex; align-items: center; gap: .45rem; padding: .5rem .9rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-panel); color: var(--text-secondary); font-size: .76rem; font-weight: 750; transition: box-shadow .18s ease, border-color .18s ease; }
	.chip .dot { width: 9px; height: 9px; border-radius: 99px; }
	.chip.on { color: var(--text-primary); border-color: var(--c); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c), transparent 78%), 0 6px 16px color-mix(in srgb, var(--c), transparent 70%); }
	.kinds { display: flex; gap: .45rem; justify-content: center; }
	.kind { padding: .5rem 1.1rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-panel); color: var(--text-secondary); font-size: .72rem; font-weight: 800; letter-spacing: .06em; }
	.kind.on { color: #fff; border-color: var(--accent); background: var(--accent); }
	.kind.amber.on { border-color: #d99a2b; background: #d99a2b; }
	.hint { margin: 0; color: var(--danger, #e0455a); font-size: .72rem; font-weight: 700; }
	.policy { display: flex; gap: .6rem; align-items: flex-start; padding: .75rem .9rem; border: 1px dashed color-mix(in srgb, var(--danger, #e0455a), transparent 55%); border-radius: 12px; background: color-mix(in srgb, var(--danger, #e0455a), transparent 94%); color: var(--text-secondary); font-size: .7rem; line-height: 1.5; text-align: left; }
	.policy :global(svg) { flex: 0 0 15px; margin-top: 2px; color: var(--danger, #e0455a); }
	.policy b { color: var(--danger, #e0455a); }

	.breather { display: grid; justify-items: center; gap: .5rem; }
	.breather .bicon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; color: #fff; background: var(--success, #2f9e6e); }
	.breather .bicon.alt { background: #2b8ba6; }
	.breather p { margin: 0; font-size: .88rem; font-weight: 700; color: var(--text-secondary); }
	.breather { grid-template-columns: 1fr; }
	.breather .bicon + .bicon { display: none; }

	.dial { margin: .3rem 0; }
	.state-pill { padding: .28rem .8rem; border-radius: 999px; background: var(--accent); color: #fff; font-size: .62rem; font-weight: 800; letter-spacing: .12em; }
	.state-pill.amber { background: #d99a2b; }
	.dial .time { margin-top: .5rem; font-size: 3.5rem; font-weight: 800; letter-spacing: -.06em; line-height: 1; font-variant-numeric: tabular-nums; }
	.dial-label { margin-top: .45rem; color: var(--text-secondary); font-size: .78rem; font-weight: 650; letter-spacing: .02em; }
	.theory-card { display: grid; gap: .25rem; width: 100%; max-width: 420px; padding: .85rem 1rem; border: 1px solid color-mix(in srgb, #2b8ba6, transparent 55%); border-radius: 13px; background: color-mix(in srgb, #2b8ba6, transparent 92%); }
	.theory-card b { color: #2b8ba6; font-size: .74rem; letter-spacing: .09em; }
	.theory-card span { color: var(--text-secondary); font-size: .76rem; line-height: 1.5; }

	.controls { display: flex; gap: .55rem; flex-wrap: wrap; justify-content: center; }
	.primary, .stop, .ghost { padding: .72rem 1.5rem; border-radius: 12px; border: 1px solid transparent; font-size: .86rem; font-weight: 800; }
	.primary { color: #fff; background: var(--btn, var(--accent)); box-shadow: 0 8px 18px color-mix(in srgb, var(--btn, var(--accent)), transparent 66%); }
	.primary.amber { --btn: #d99a2b; }
	.primary:disabled { opacity: .45; box-shadow: none; }
	.stop { display: inline-flex; align-items: center; gap: .4rem; color: #fff; background: var(--danger, #e0455a); }
	.stop:disabled { opacity: .45; }
	.ghost { color: var(--text-secondary); border-color: var(--border-subtle); background: var(--surface-panel); }
	.ghost:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
	.ghost:disabled { opacity: .45; }

	.side { display: grid; gap: .8rem; }
	.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
	.stat { display: grid; gap: .25rem; padding: 1.1rem 1.2rem; }
	.k { display: flex; align-items: center; gap: .35rem; color: var(--text-secondary); font-size: .6rem; font-weight: 800; letter-spacing: .09em; }
	.stat b { font-size: 1.45rem; font-weight: 800; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
	.stat b small { margin-left: .25rem; font-size: .68rem; font-weight: 750; color: var(--text-secondary); }
	.sub { color: var(--text-secondary); font-size: .6rem; font-weight: 800; letter-spacing: .08em; display: inline-flex; align-items: center; gap: .3rem; }
	.goal-edit { display: flex; gap: .35rem; }
	.goal-edit button { width: 26px; height: 24px; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-secondary); background: var(--surface-panel); font-weight: 800; }
	.goal-edit button:hover { color: var(--accent); border-color: var(--accent); }
	.peak { display: flex; gap: .8rem; align-items: center; padding: 1.1rem 1.2rem; }
	.picon { display: grid; place-items: center; width: 38px; height: 38px; flex: 0 0 38px; border-radius: 12px; color: #d99a2b; background: color-mix(in srgb, #d99a2b, transparent 86%); }
	.peak b { display: block; font-size: 1.05rem; letter-spacing: -.03em; }
	.health { padding: 1.1rem 1.2rem; }
	.health ul { display: grid; gap: .45rem; margin: .6rem 0 0; padding: 0; list-style: none; }
	.health li { display: flex; align-items: center; gap: .5rem; font-size: .78rem; }
	.health .dot { width: 9px; height: 9px; border-radius: 99px; }
	.health .badge { margin-left: auto; padding: .18rem .5rem; border-radius: 999px; background: var(--surface-subtle); color: var(--text-secondary); font-size: .56rem; font-weight: 800; letter-spacing: .06em; }
	.health .badge.fresh { background: color-mix(in srgb, #2f9e6e, transparent 86%); color: #2f9e6e; }
	.health .badge.stale { background: color-mix(in srgb, #e0455a, transparent 88%); color: #e0455a; }
	.goal { background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent), #b44df0 55%)); border: 0; color: #fff; padding: 1.1rem 1.2rem; }
	.goal-head { display: flex; justify-content: space-between; gap: .5rem; font-size: .66rem; font-weight: 800; letter-spacing: .08em; }
	.goal-head b { font-size: .8rem; }
	.bar { height: 8px; margin: .7rem 0; border-radius: 99px; background: rgb(255 255 255 / 26%); overflow: hidden; }
	.fill { height: 100%; border-radius: 99px; background: #fff; transition: width .4s ease; }
	.goal-foot { display: flex; align-items: center; justify-content: space-between; font-size: .68rem; font-weight: 750; }
	.sliders-btn { display: inline-flex; align-items: center; gap: .35rem; padding: .35rem .7rem; border: 1px solid rgb(255 255 255 / 45%); border-radius: 9px; color: #fff; background: rgb(255 255 255 / 12%); font-size: .66rem; font-weight: 800; }

	.analytics { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.2rem; align-items: stretch; }
	.analytics > :global(*) { padding: 1.3rem 1.4rem; height: 100%; box-sizing: border-box; }

	.report-list { display: grid; gap: .5rem; margin: 0; padding: 0; list-style: none; }
	.report-list li { display: flex; align-items: center; gap: .6rem; padding: .6rem .7rem; border: 1px solid var(--border-subtle); border-radius: 11px; }
	.report-list .dot { width: 10px; height: 10px; flex: 0 0 10px; border-radius: 99px; }
	.rl-main { display: grid; gap: .1rem; text-align: left; min-width: 0; }
	.rl-main b { font-size: .8rem; }
	.rl-main span { color: var(--text-secondary); font-size: .68rem; }
	.rl-nums { margin-left: auto; display: grid; gap: .1rem; text-align: right; }
	.rl-nums span { color: var(--text-secondary); font-size: .64rem; font-weight: 750; }
	.rl-nums b { font-size: .76rem; font-variant-numeric: tabular-nums; }
	.empty-note { margin: 0; color: var(--text-secondary); font-size: .82rem; text-align: center; padding: 1rem 0; }

	.btn { padding: .6rem 1.15rem; border-radius: 11px; border: 1px solid transparent; font-size: .82rem; font-weight: 750; }
	.btn.ghost { color: var(--text-secondary); border-color: var(--border-subtle); background: var(--surface-panel); }
	.btn.solid { color: #fff; background: var(--accent); }
	.bump-row { display: flex; gap: .45rem; margin-top: .8rem; }
	.bump { flex: 1; padding: .5rem; border: 1px solid var(--border-subtle); border-radius: 10px; color: var(--accent); background: var(--accent-soft); font-size: .76rem; font-weight: 800; }

	@media (max-width: 1020px) { .layout { grid-template-columns: minmax(0, 1fr); } .stat-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); } }
	@media (max-width: 760px) {
		.layout { grid-template-columns: 1fr !important; }
		.page-head { flex-direction: column; gap: .6rem; }
		.clockbox { text-align: left; }
		.dial .time { font-size: 2.4rem; }
		.ring-wrapper { transform: scale(0.95); transform-origin: center; }
		.toolbar { flex-wrap: wrap; width: 100% !important; }
		.spacer { display: none !important; }
		.toolbar .tb, .toolbar .ic { flex: 1 1 auto; justify-content: center; min-width: 0; }
		.tabs { width: 100% !important; display: flex !important; }
		.tab { flex: 1; text-align: center; padding-inline: .4rem !important; font-size: .68rem !important; }
		.presets, .sw-setup { max-width: none !important; }
		.theory-card { max-width: none !important; }
		.card { width: 100% !important; box-sizing: border-box; padding: 1rem 0.5rem !important; }
		.settings { grid-template-columns: 1fr 1fr !important; width: 100% !important; }
		.chip { flex: 1 1 auto; justify-content: center; }
		.analytics { grid-template-columns: 1fr !important; }
		.stat-grid { grid-template-columns: 1fr 1fr; }
		.stage { width: 100% !important; box-sizing: border-box; }
	}
</style>
