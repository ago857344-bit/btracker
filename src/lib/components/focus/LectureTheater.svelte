<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { tracker, updateTracker, recordFocus, celebration } from '$lib/stores/tracker';
	import { SUBJECTS } from '$lib/state/subjects';
	import type { SubjectCode } from '$lib/types/tracker';
	import { uiClick, uiSuccess } from '$lib/utils/feedback';
	import { calculateCurrentScore } from '$lib/state/decay';

	export let open = false;

	let inputUrl = '';
	let currentVideoId: string | null = null;
	let videoTitle = 'Physics / Maths Lecture';
	let selectedSubject: SubjectCode = 'P';
	let chapterName = '';
	let videoJustLoaded = false;

	// YouTube Player
	let ytPlayer: any = null;
	let isPlayerReady = false;
	let currentPlaybackTime = 0;
	let playbackPollInterval: ReturnType<typeof setInterval> | undefined;

	// Theory Stopwatch
	let theoryStopwatchRunning = false;
	let theorySeconds = 0;
	let theoryTimerInterval: ReturnType<typeof setInterval> | undefined;

	// Notes & Scratchpad
	let notesText = '';
	let notesPanelOpen = false;
	let notesPanelMinimized = false;
	let isPreviewMode = false;
	let textareaElem: HTMLTextAreaElement;
	let stampFlash = false;

	// Chapter memory decay tracking
	$: chapterKey = chapterName.trim() ? `${selectedSubject}-${chapterName.trim()}` : '';
	$: chapterDecay = chapterKey ? $tracker.rev.chapters[chapterKey]?.decay ?? null : null;
	$: chapterMemoryScore = chapterDecay ? Math.round(calculateCurrentScore(chapterDecay)) : null;
	$: chapterHalfLife = chapterDecay?.halfLife ?? null;
	$: chapterNextRevision = chapterDecay?.lastRevisionAt ? chapterDecay.lastRevisionAt : null;
	$: memoryHealth = chapterMemoryScore !== null
		? (chapterMemoryScore >= 60 ? 'fresh' : chapterMemoryScore >= 30 ? 'fading' : 'critical')
		: null;

	// KaTeX
	let katexModule: any = null;
	async function ensureKatex() {
		if (!katexModule) {
			try {
				const mod = await import('katex');
				katexModule = mod.default || mod;
			} catch {}
		}
	}

	// Recent lectures history
	interface RecentLecture {
		id: string;
		title: string;
		subject: SubjectCode;
		chapter: string;
		savedAt: number;
	}
	let recentLectures: RecentLecture[] = [];

	function extractYouTubeId(url: string): string | null {
		if (!url) return null;
		const clean = url.trim();
		if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
		const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([a-zA-Z0-9_-]{11})/i);
		return match ? match[1] : null;
	}

	function loadRecentLectures() {
		try {
			const saved = localStorage.getItem('btracker_recent_lectures');
			if (saved) recentLectures = JSON.parse(saved);
		} catch {}
	}

	function saveRecentLecture(id: string, title: string) {
		recentLectures = [
			{ id, title: title || `Lecture (${id})`, subject: selectedSubject, chapter: chapterName, savedAt: Date.now() },
			...recentLectures.filter((l) => l.id !== id)
		].slice(0, 8);
		try {
			localStorage.setItem('btracker_recent_lectures', JSON.stringify(recentLectures));
		} catch {}
	}

	function loadVideoNotes(id: string) {
		try {
			const saved = localStorage.getItem(`btracker_lecture_notes_${id}`);
			notesText = saved || `## Key Derivations & Takeaways\n[00:00] Lecture began — setup & core definitions.\n`;
		} catch {
			notesText = '';
		}
	}

	function saveVideoNotes() {
		if (!currentVideoId) return;
		try {
			localStorage.setItem(`btracker_lecture_notes_${currentVideoId}`, notesText);
		} catch {}
	}

	async function loadVideo(id: string, title?: string) {
		currentVideoId = id;
		videoTitle = title || `Lecture ${id}`;
		loadVideoNotes(id);
		saveRecentLecture(id, videoTitle);
		videoJustLoaded = true;
		setTimeout(() => (videoJustLoaded = false), 600);
		await tick();
		initYouTubePlayer(id);
		startTheoryStopwatch();
	}

	function handleLoadFromInput() {
		const id = extractYouTubeId(inputUrl);
		if (!id) {
			celebration.set('Invalid YouTube URL — please check and try again');
			return;
		}
		loadVideo(id);
		inputUrl = '';
	}

	function initYouTubePlayer(videoId: string) {
		// Clean up existing
		if (ytPlayer && typeof ytPlayer.destroy === 'function') {
			try { ytPlayer.destroy(); } catch {}
		}
		isPlayerReady = false;

		const init = () => {
			if (!(window as any).YT || !(window as any).YT.Player) {
				setTimeout(init, 200);
				return;
			}
			try {
				ytPlayer = new (window as any).YT.Player('lecture-yt-iframe', {
					videoId,
					playerVars: {
						autoplay: 1,
						modestbranding: 1,
						rel: 0,
						iv_load_policy: 3,
						fs: 1
					},
					events: {
						onReady: () => {
							isPlayerReady = true;
							startPlaybackTracking();
						},
						onStateChange: (event: any) => {
							// 1 = playing, 2 = paused
							if (event.data === 1 && !theoryStopwatchRunning) {
								startTheoryStopwatch();
							}
						}
					}
				});
			} catch (err) {
				console.warn('YT Player init error:', err);
			}
		};

		init();
	}

	function startPlaybackTracking() {
		clearInterval(playbackPollInterval);
		playbackPollInterval = setInterval(() => {
			if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
				try {
					currentPlaybackTime = Math.floor(ytPlayer.getCurrentTime() || 0);
				} catch {}
			}
		}, 600);
	}

	function formatTime(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) {
			return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		}
		return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}

	function parseTimeToSeconds(timeStr: string): number {
		const parts = timeStr.trim().replace(/[\[\]]/g, '').split(':').map(Number);
		if (parts.length === 3) {
			return parts[0] * 3600 + parts[1] * 60 + parts[2];
		} else if (parts.length === 2) {
			return parts[0] * 60 + parts[1];
		}
		return 0;
	}

	function seekToTimestamp(seconds: number) {
		uiClick();
		if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
			ytPlayer.seekTo(seconds, true);
			ytPlayer.playVideo();
		}
	}

	function insertTimestampNote() {
		uiClick();
		const stamp = `[${formatTime(currentPlaybackTime)}] `;
		stampFlash = true;
		setTimeout(() => (stampFlash = false), 400);
		if (!textareaElem) {
			notesText += `\n${stamp}`;
			saveVideoNotes();
			return;
		}

		const start = textareaElem.selectionStart;
		const end = textareaElem.selectionEnd;
		const text = notesText;
		notesText = text.substring(0, start) + stamp + text.substring(end);
		saveVideoNotes();

		tick().then(() => {
			textareaElem.focus();
			textareaElem.selectionStart = textareaElem.selectionEnd = start + stamp.length;
		});
	}

	function handleNotesKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const stamp = `\n[${formatTime(currentPlaybackTime)}] `;
			const start = textareaElem.selectionStart;
			const end = textareaElem.selectionEnd;
			notesText = notesText.substring(0, start) + stamp + notesText.substring(end);
			saveVideoNotes();

			tick().then(() => {
				textareaElem.selectionStart = textareaElem.selectionEnd = start + stamp.length;
			});
		}
	}

	// Theory Stopwatch controls
	function startTheoryStopwatch() {
		theoryStopwatchRunning = true;
		clearInterval(theoryTimerInterval);
		theoryTimerInterval = setInterval(() => {
			theorySeconds++;
		}, 1000);
	}

	function toggleTheoryStopwatch() {
		uiClick();
		if (theoryStopwatchRunning) {
			theoryStopwatchRunning = false;
			clearInterval(theoryTimerInterval);
		} else {
			startTheoryStopwatch();
		}
	}

	function saveTheorySession() {
		uiSuccess();
		const mins = Math.max(1, Math.round(theorySeconds / 60));
		const epochMin = Math.floor(Date.now() / 60000);
		const chapter = chapterName.trim() || 'YouTube Lecture';

		recordFocus({
			startedEpochMinutes: epochMin - mins,
			durationMinutes: mins,
			activity: 'Theory: ' + videoTitle,
			deadlineId: null,
			subject: selectedSubject,
			chapter
		});
		celebration.set(`Saved ${mins}m of Theory Focus to study logs! 📚`);
		theorySeconds = 0;
	}

	function handleTheaterClose() {
		if (theorySeconds >= 60) {
			saveTheorySession();
		}
		open = false;
	}

	// Render Notes with Interactive Timestamps and KaTeX
	function renderFormattedNotes(content: string): string {
		if (!content) return '<p class="muted">No notes yet. Type alongside the lecture...</p>';

		// Escape basic HTML
		let html = content
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Headers
		html = html.replace(/^### (.*$)/gim, '<h4 class="note-h4">$1</h4>');
		html = html.replace(/^## (.*$)/gim, '<h3 class="note-h3">$1</h3>');
		html = html.replace(/^# (.*$)/gim, '<h2 class="note-h2">$1</h2>');

		// Bold & italic
		html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
		html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

		// Replace [mm:ss] or [hh:mm:ss] with interactive buttons
		html = html.replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, (match, timeStr) => {
			const sec = parseTimeToSeconds(timeStr);
			return `<button type="button" class="timestamp-chip" data-seconds="${sec}" title="Jump video to ${timeStr}">⏱️ ${timeStr}</button>`;
		});

		// KaTeX inline math
		if (katexModule) {
			html = html.replace(/\$([^\$]+)\$/g, (match, tex) => {
				try {
					return katexModule.renderToString(tex, { displayMode: false, throwOnError: false });
				} catch {
					return `<code>${tex}</code>`;
				}
			});
		}

		// Newlines to breaks
		html = html.replace(/\n/g, '<br/>');

		return html;
	}

	function handlePreviewClick(e: MouseEvent) {
		const target = (e.target as HTMLElement).closest('.timestamp-chip');
		if (target) {
			const sec = Number(target.getAttribute('data-seconds'));
			if (!isNaN(sec)) {
				seekToTimestamp(sec);
			}
		}
	}

	onMount(() => {
		ensureKatex();
		loadRecentLectures();

		// Load YouTube IFrame API script if not present
		if (typeof window !== 'undefined' && !(window as any).YT) {
			const tag = document.createElement('script');
			tag.src = 'https://www.youtube.com/iframe_api';
			document.body.appendChild(tag);
		}
	});

	onDestroy(() => {
		clearInterval(playbackPollInterval);
		clearInterval(theoryTimerInterval);
		if (ytPlayer && typeof ytPlayer.destroy === 'function') {
			try { ytPlayer.destroy(); } catch {}
		}
	});
</script>

{#if open}
	<div
		class="theater-backdrop"
		transition:fade={{ duration: 250, easing: cubicOut }}
		on:click={handleTheaterClose}
		on:keydown={(e) => e.key === 'Escape' && handleTheaterClose()}
		role="button"
		tabindex="-1"
		aria-label="Close Lecture Theater"
	></div>

	<div class="theater-modal" transition:fly={{ y: 30, duration: 380, easing: cubicOut }} role="dialog">
		<!-- Header Toolbar -->
		<header class="theater-header">
			<div class="header-left" style="animation: headerSlideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both">
				<div class="theater-badge">
					<NavIcon name="tv" size={17} />
				</div>
				<div class="header-text" style="animation: headerTextFade 0.6s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both">
					<h3>Distraction-Free Lecture Theater</h3>
					<p class="sub">Watch lectures with zero algorithm recommendations &amp; timestamped derivations</p>
				</div>
			</div>

			<!-- Theory Stopwatch Pill -->
			<div class="theory-stopwatch-pill" style="animation: pillPop 0.5s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both">
				<div class="sw-time font-mono">
					<span class="rec-dot" class:active={theoryStopwatchRunning}></span>
					<span>{formatTime(theorySeconds)}</span>
				</div>
				{#if chapterKey && theorySeconds >= 10}
					<span class="session-decay-link" transition:scale={{ duration: 200 }}>
						<NavIcon name="brain" size={11} />
						<span class="decay-link-text">{Math.max(1, Math.round(theorySeconds / 60))}m → {memoryHealth === 'fresh' ? '↑' : memoryHealth === 'fading' ? '↗' : '⚠'} decay</span>
					</span>
				{/if}
				<button type="button" class="btn-sw" on:click={toggleTheoryStopwatch}>
					{theoryStopwatchRunning ? 'Pause' : 'Resume'}
				</button>
				{#if theorySeconds >= 60}
					<button type="button" class="btn-sw-save" transition:scale={{ duration: 250, easing: cubicOut }} on:click={saveTheorySession} title="Save to Study Logs">
						<NavIcon name="check" size={12} /> Log
					</button>
				{/if}
			</div>

			<div class="header-right" style="animation: headerSlideIn 0.5s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both">
				<button type="button" class="btn-close" on:click={handleTheaterClose}>
					<NavIcon name="x" size={18} />
				</button>
			</div>
		</header>

		<!-- URL Input & Metadata Bar -->
		<div class="theater-controls-bar" style="animation: controlsSlideUp 0.5s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both">
			<div class="url-input-wrap">
				<NavIcon name="search" size={14} />
				<input
					type="text"
					placeholder="Paste YouTube Video URL or ID (e.g. https://youtu.be/...)"
					bind:value={inputUrl}
					on:keydown={(e) => e.key === 'Enter' && handleLoadFromInput()}
				/>
				<button type="button" class="btn-load" on:click={handleLoadFromInput}>
					Load Lecture
				</button>
			</div>

			<!-- Subject & Chapter Meta -->
			<div class="lecture-meta-inputs">
				<div class="sub-picker">
					{#each ['P', 'C', 'M'] as sub, i}
						<button
							type="button"
							class="sub-pill {sub.toLowerCase()}"
							class:active={selectedSubject === sub}
							style="animation-delay: {0.2 + i * 0.06}s"
							on:click={() => (selectedSubject = sub as SubjectCode)}
						>
							{sub === 'P' ? 'Physics' : sub === 'C' ? 'Chem' : 'Maths'}
						</button>
					{/each}
					<span class="sub-pill-indicator" style="transform: translateX({selectedSubject === 'P' ? 0 : selectedSubject === 'C' ? 100 : 200}%)"></span>
				</div>
				<input
					type="text"
					class="chapter-input"
					placeholder="Chapter / Topic Name"
					bind:value={chapterName}
				/>
				{#if chapterKey && chapterMemoryScore !== null}
					<div class="memory-indicator" class:fresh={memoryHealth === 'fresh'} class:fading={memoryHealth === 'fading'} class:critical={memoryHealth === 'critical'} transition:scale={{ duration: 250, easing: cubicOut }}>
						<div class="memory-ring">
							<svg viewBox="0 0 36 36" class="memory-ring-svg">
								<circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3" class="ring-bg" />
								<circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3" class="ring-fill"
									stroke-dasharray="{chapterMemoryScore * 0.974} 100"
									stroke-dashoffset="0"
									pathLength="100" />
							</svg>
							<span class="memory-score">{chapterMemoryScore}</span>
						</div>
						<div class="memory-details">
							<span class="memory-label">{memoryHealth === 'fresh' ? 'Strong' : memoryHealth === 'fading' ? 'Fading' : 'Critical'}</span>
							{#if chapterHalfLife}
								<span class="memory-halflife">τ {Math.round(chapterHalfLife)}d</span>
							{/if}
						</div>
					</div>
				{:else if chapterKey}
					<div class="memory-indicator new-chapter" transition:scale={{ duration: 250, easing: cubicOut }}>
						<div class="memory-ring">
							<svg viewBox="0 0 36 36" class="memory-ring-svg">
								<circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3" class="ring-bg" />
							</svg>
							<span class="memory-score">—</span>
						</div>
						<div class="memory-details">
							<span class="memory-label">New chapter</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Notes Toggle -->
			<button
				type="button"
				class="notes-toggle-btn"
				class:active={notesPanelOpen}
				on:click={() => { notesPanelOpen = !notesPanelOpen; if (notesPanelOpen) notesPanelMinimized = false; }}
				title="Toggle Timestamped Scratchpad"
			>
				<NavIcon name="edit" size={14} />
				<span>Notes</span>
				{#if notesPanelOpen}
					<span class="notes-status-dot"></span>
				{/if}
			</button>
		</div>

		<!-- Main Workspace Area — Video always full width -->
		<div class="theater-workspace">
			<div class="video-container">
				{#if currentVideoId}
					<div class="iframe-aspect-ratio" class:video-enter={videoJustLoaded}>
						<div id="lecture-yt-iframe"></div>
					</div>
					<div class="video-bottom-strip" class:stamp-flash={stampFlash}>
						<span class="current-time-badge font-mono">⏱️ {formatTime(currentPlaybackTime)}</span>
						<button type="button" class="btn-stamp-action" class:stamp-flash={stampFlash} on:click={insertTimestampNote}>
							<NavIcon name="plus" size={13} />
							<span>Auto-Stamp [ {formatTime(currentPlaybackTime)} ]</span>
						</button>
					</div>
				{:else}
					<div class="empty-player-state">
						<div class="empty-icon" style="animation: emptyIconFloat 3s ease-in-out infinite, fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both"><NavIcon name="tv" size={44} /></div>
						<h4 style="animation: fadeInUp 0.6s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both">Paste a YouTube Lecture URL Above</h4>
						<p style="animation: fadeInUp 0.6s 0.18s cubic-bezier(0.22, 1, 0.36, 1) both">Enjoy a focused viewing experience with zero sidebars, recommended videos, or comment distractions.</p>

						{#if recentLectures.length > 0}
							<div class="recent-lectures-wrap" style="animation: fadeInUp 0.6s 0.28s cubic-bezier(0.22, 1, 0.36, 1) both">
								<span class="recent-title font-mono">RECENT LECTURES:</span>
								<div class="recent-chips">
									{#each recentLectures as item, i}
										<button
											type="button"
											class="recent-chip"
											style="animation: chipPop 0.4s {0.35 + i * 0.06}s cubic-bezier(0.34, 1.56, 0.64, 1) both"
											on:click={() => loadVideo(item.id, item.title)}
										>
											<span class="sub-dot sub-{item.subject.toLowerCase()}"></span>
											<span>{item.title}</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Floating Notes Panel -->
		{#if notesPanelOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div
				class="notes-floating-panel"
				class:minimized={notesPanelMinimized}
				in:fly={{ x: 30, y: 10, duration: 350, easing: cubicOut }}
				out:fly={{ x: 20, y: 10, duration: 200, easing: cubicIn }}
				on:click|stopPropagation
			>
				<div class="notes-panel-header">
					<div class="notes-panel-title">
						<NavIcon name="edit" size={13} />
						<b class="font-mono">SCRATCHPAD</b>
						<span class="hint-key"><kbd>Enter</kbd> = stamp time</span>
					</div>
					<div class="notes-panel-controls">
						<button
							type="button"
							class="btn-preview-toggle"
							class:active={isPreviewMode}
							on:click={() => (isPreviewMode = !isPreviewMode)}
						>
							{isPreviewMode ? 'Edit' : 'Preview'}
						</button>
						<button type="button" class="stamp-chip-btn" class:stamp-flash={stampFlash} on:click={insertTimestampNote}>
							+ [{formatTime(currentPlaybackTime)}]
						</button>
						<button
							type="button"
							class="btn-minimize"
							on:click={() => (notesPanelMinimized = !notesPanelMinimized)}
							title={notesPanelMinimized ? 'Expand' : 'Minimize'}
						>
							<NavIcon name={notesPanelMinimized ? 'maximize-2' : 'minimize-2'} size={13} />
						</button>
						<button
							type="button"
							class="btn-close-panel"
							on:click={() => (notesPanelOpen = false)}
							title="Close Notes"
						>
							<NavIcon name="x" size={14} />
						</button>
					</div>
				</div>

				{#if !notesPanelMinimized}
					<div class="notes-panel-body" style="animation: fadeSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both">
						{#if isPreviewMode}
							<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
							<div
								class="notes-preview-render"
								on:click={handlePreviewClick}
								role="region"
								aria-label="Interactive timestamp notes preview"
							>
								{@html renderFormattedNotes(notesText)}
							</div>
						{:else}
							<textarea
								bind:this={textareaElem}
								class="notes-textarea font-mono"
								placeholder="Take notes here...&#10;Press Enter to auto-stamp [18:42]&#10;LaTeX: $ \int f(x) dx $ or $ F = ma $"
								bind:value={notesText}
								on:keydown={handleNotesKeydown}
								on:input={saveVideoNotes}
							></textarea>
						{/if}
					</div>
				{:else}
					<div class="notes-minimized-preview" style="animation: fadeSlideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1) both" on:click={() => (notesPanelMinimized = false)} role="button" tabindex="-1">
						{#if notesText.trim()}
							<p class="preview-text">{notesText.trim().split('\n').slice(-2).join(' ')}</p>
						{:else}
							<p class="preview-text muted">Click to expand scratchpad...</p>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.theater-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.78);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		z-index: 10000;
	}

	.theater-modal {
		position: fixed;
		inset: 1.2rem;
		z-index: 10001;
		background: #0a0a14 !important;
		border: 1px solid var(--border-subtle);
		border-radius: 20px;
		display: flex;
		flex-direction: column;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75);
		overflow: hidden;
	}

	/* ── Keyframe Animations ── */
	@keyframes headerSlideIn {
		from { opacity: 0; transform: translateX(-16px); }
		to { opacity: 1; transform: translateX(0); }
	}
	@keyframes headerTextFade {
		from { opacity: 0; transform: translateY(4px); }
		to { opacity: 1; transform: translateY(0); }
	}
	@keyframes pillPop {
		from { opacity: 0; transform: scale(0.85); }
		60% { transform: scale(1.04); }
		to { opacity: 1; transform: scale(1); }
	}
	@keyframes controlsSlideUp {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}
	@keyframes fadeInUp {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}
	@keyframes emptyIconFloat {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-8px); }
	}
	@keyframes chipPop {
		from { opacity: 0; transform: scale(0.7); }
		70% { transform: scale(1.06); }
		to { opacity: 1; transform: scale(1); }
	}
	@keyframes fadeSlideUp {
		from { opacity: 0; transform: translateY(6px); }
		to { opacity: 1; transform: translateY(0); }
	}
	@keyframes stampPulse {
		0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent); }
		50% { box-shadow: 0 0 0 8px transparent; }
		100% { box-shadow: 0 0 0 0 transparent; }
	}
	@keyframes stripFlash {
		0% { background: rgba(15, 15, 25, 0.95); }
		30% { background: color-mix(in srgb, var(--accent) 12%, rgba(15, 15, 25, 0.95)); }
		100% { background: rgba(15, 15, 25, 0.95); }
	}
	@keyframes videoEnter {
		from { opacity: 0; transform: scale(0.97); }
		to { opacity: 1; transform: scale(1); }
	}
	@keyframes recDotGlow {
		0%, 100% { box-shadow: 0 0 6px #ef4444; }
		50% { box-shadow: 0 0 14px #ef4444, 0 0 24px rgba(239, 68, 68, 0.3); }
	}
	@keyframes badgePulse {
		0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, #ef4444 20%, transparent); }
		50% { box-shadow: 0 0 0 6px transparent; }
	}

	/* ── Header ── */
	.theater-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1.4rem;
		background: color-mix(in srgb, var(--surface-panel) 94%, transparent);
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
		flex-wrap: wrap;
		gap: 0.8rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.theater-badge {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: color-mix(in srgb, #ef4444 15%, transparent);
		color: #ef4444;
		border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
		display: grid;
		place-items: center;
		animation: badgePulse 3s ease-in-out infinite;
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.theater-badge:hover {
		transform: scale(1.1) rotate(-4deg);
	}

	.header-left h3 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.header-left .sub {
		margin: 0;
		font-size: 0.72rem;
		color: var(--text-secondary);
	}

	/* ── Theory Stopwatch ── */
	.theory-stopwatch-pill {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.65rem;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		border-radius: 99px;
		transition: border-color 0.3s, box-shadow 0.3s;
	}

	.theory-stopwatch-pill:has(.rec-dot.active) {
		border-color: color-mix(in srgb, #ef4444 35%, var(--border-subtle));
		box-shadow: 0 0 12px color-mix(in srgb, #ef4444 10%, transparent);
	}

	.session-decay-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.1rem 0.45rem;
		border-radius: 99px;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
		font-size: 0.6rem;
		font-weight: 700;
		color: var(--accent);
		white-space: nowrap;
	}

	.decay-link-text {
		font-family: ui-monospace, monospace;
		letter-spacing: 0.02em;
	}

	.sw-time {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.84rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.rec-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #6b7280;
		transition: background 0.3s, box-shadow 0.3s;
	}

	.rec-dot.active {
		background: #ef4444;
		animation: recDotGlow 1.5s ease-in-out infinite;
	}

	@keyframes pulseRec {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.4; transform: scale(1.2); }
	}

	.btn-sw {
		background: transparent;
		border: none;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--accent);
		cursor: pointer;
		transition: transform 0.15s;
	}

	.btn-sw:active {
		transform: scale(0.92);
	}

	.btn-sw-save {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
		background: var(--accent);
		color: #ffffff;
		border: none;
		font-size: 0.68rem;
		font-weight: 750;
		cursor: pointer;
		transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
	}

	.btn-sw-save:hover {
		transform: scale(1.06);
		box-shadow: 0 2px 12px color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.btn-sw-save:active {
		transform: scale(0.94);
	}

	.btn-close {
		width: 34px;
		height: 34px;
		border-radius: 9px;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.btn-close:hover {
		background: color-mix(in srgb, #ef4444 12%, transparent);
		color: #ef4444;
		transform: rotate(90deg) scale(1.1);
	}

	/* ── Controls Bar ── */
	.theater-controls-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		padding: 0.6rem 1.4rem;
		background: color-mix(in srgb, var(--surface-subtle) 75%, transparent);
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	.url-input-wrap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		padding: 0.35rem 0.65rem;
		flex: 1;
		min-width: 280px;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.url-input-wrap:focus-within {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
	}

	.url-input-wrap input {
		background: transparent;
		border: none;
		outline: none;
		font-size: 0.78rem;
		color: var(--text-primary);
		flex: 1;
	}

	.btn-load {
		background: var(--accent);
		color: #ffffff;
		border: none;
		border-radius: 7px;
		padding: 0.25rem 0.65rem;
		font-size: 0.72rem;
		font-weight: 750;
		cursor: pointer;
		transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
	}

	.btn-load:hover {
		transform: scale(1.05);
		box-shadow: 0 2px 10px color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.btn-load:active {
		transform: scale(0.95);
	}

	.lecture-meta-inputs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sub-picker {
		display: flex;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		overflow: hidden;
		position: relative;
	}

	.sub-pill {
		background: transparent;
		border: none;
		padding: 0.25rem 0.55rem;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		position: relative;
		z-index: 1;
		transition: color 0.2s;
	}

	.sub-pill.active {
		color: #ffffff;
	}

	.sub-pill.p.active { background: #3b82f6; }
	.sub-pill.c.active { background: #10b981; }
	.sub-pill.m.active { background: #f59e0b; color: #1c1002; }

	.chapter-input {
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 0.25rem 0.6rem;
		font-size: 0.72rem;
		color: var(--text-primary);
		outline: none;
		width: 140px;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.chapter-input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
	}

	/* ── Memory Decay Indicator ── */
	.memory-indicator {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.2rem 0.55rem 0.2rem 0.25rem;
		border-radius: 99px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		transition: all 0.3s ease;
	}

	.memory-indicator.fresh {
		border-color: color-mix(in srgb, #10b981 40%, var(--border-subtle));
		background: color-mix(in srgb, #10b981 8%, var(--surface-panel));
	}

	.memory-indicator.fading {
		border-color: color-mix(in srgb, #f59e0b 40%, var(--border-subtle));
		background: color-mix(in srgb, #f59e0b 8%, var(--surface-panel));
	}

	.memory-indicator.critical {
		border-color: color-mix(in srgb, #ef4444 40%, var(--border-subtle));
		background: color-mix(in srgb, #ef4444 8%, var(--surface-panel));
		animation: criticalPulse 2s ease-in-out infinite;
	}

	.memory-indicator.new-chapter {
		border-color: color-mix(in srgb, var(--accent) 30%, var(--border-subtle));
		opacity: 0.7;
	}

	@keyframes criticalPulse {
		0%, 100% { box-shadow: 0 0 0 0 transparent; }
		50% { box-shadow: 0 0 8px color-mix(in srgb, #ef4444 25%, transparent); }
	}

	.memory-ring {
		position: relative;
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
	}

	.memory-ring-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.memory-ring-svg .ring-bg {
		stroke: color-mix(in srgb, var(--text-secondary) 15%, transparent);
	}

	.memory-indicator.fresh .ring-fill {
		stroke: #10b981;
		transition: stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.memory-indicator.fading .ring-fill {
		stroke: #f59e0b;
		transition: stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.memory-indicator.critical .ring-fill {
		stroke: #ef4444;
		transition: stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.memory-score {
		font-size: 0.68rem;
		font-weight: 800;
		color: var(--text-primary);
		z-index: 1;
		font-family: ui-monospace, monospace;
	}

	.memory-details {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.memory-label {
		font-size: 0.62rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.1;
	}

	.memory-halflife {
		font-size: 0.56rem;
		font-weight: 600;
		color: var(--text-secondary);
		line-height: 1.1;
		font-family: ui-monospace, monospace;
	}

	/* ── Workspace ── */
	.theater-workspace {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.video-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: #000000;
		overflow: hidden;
		position: relative;
	}

	.iframe-aspect-ratio {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.iframe-aspect-ratio.video-enter {
		animation: videoEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.iframe-aspect-ratio :global(iframe) {
		width: 100%;
		height: 100%;
		border: none;
	}

	.video-bottom-strip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.55rem 1rem;
		background: rgba(15, 15, 25, 0.95);
		border-top: 1px solid var(--border-subtle);
		transition: background 0.3s;
	}

	.video-bottom-strip.stamp-flash {
		animation: stripFlash 0.4s ease-out;
	}

	.current-time-badge {
		font-size: 0.78rem;
		font-weight: 800;
		color: #ffffff;
	}

	.btn-stamp-action {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.3rem 0.75rem;
		border-radius: 8px;
		background: color-mix(in srgb, var(--accent) 20%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		font-size: 0.72rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.btn-stamp-action:hover {
		background: color-mix(in srgb, var(--accent) 30%, transparent);
		transform: scale(1.05);
		box-shadow: 0 2px 12px color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.btn-stamp-action:active {
		transform: scale(0.93);
	}

	.btn-stamp-action.stamp-flash {
		animation: stampPulse 0.4s ease-out;
	}

	/* ── Empty State ── */
	.empty-player-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		color: var(--text-secondary);
	}

	.empty-icon {
		color: #ef4444;
		margin-bottom: 0.8rem;
		opacity: 0.8;
	}

	.empty-player-state h4 {
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--text-primary);
		margin: 0 0 0.4rem 0;
	}

	.empty-player-state p {
		font-size: 0.8rem;
		max-width: 420px;
		margin: 0 0 1.5rem 0;
		line-height: 1.4;
	}

	.recent-lectures-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.recent-title {
		font-size: 0.65rem;
		font-weight: 800;
		color: var(--text-secondary);
		letter-spacing: 0.05em;
	}

	.recent-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		justify-content: center;
		max-width: 460px;
	}

	.recent-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.65rem;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 99px;
		font-size: 0.7rem;
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.recent-chip:hover {
		border-color: var(--accent);
		transform: translateY(-2px) scale(1.04);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.recent-chip:active {
		transform: scale(0.95);
	}

	.sub-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.sub-dot.sub-p { background: #3b82f6; }
	.sub-dot.sub-c { background: #10b981; }
	.sub-dot.sub-m { background: #f59e0b; }

	/* ── Notes Toggle Button ── */
	.notes-toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.7rem;
		border-radius: 8px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		font-size: 0.7rem;
		font-weight: 700;
		cursor: pointer;
		position: relative;
		transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.notes-toggle-btn:hover {
		border-color: var(--accent);
		color: var(--text-primary);
		transform: translateY(-1px);
	}

	.notes-toggle-btn.active {
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		border-color: color-mix(in srgb, var(--accent) 50%, transparent);
		color: var(--accent);
		transform: scale(1.02);
	}

	.notes-toggle-btn:active {
		transform: scale(0.95);
	}

	.notes-status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 6px var(--accent);
		animation: recDotGlow 2s ease-in-out infinite;
	}

	/* ── Floating Notes Panel ── */
	.notes-floating-panel {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		width: 380px;
		height: 520px;
		z-index: 10010;
		background: color-mix(in srgb, var(--surface-panel, #121020) 96%, transparent);
		backdrop-filter: blur(36px) saturate(210%);
		-webkit-backdrop-filter: blur(36px) saturate(210%);
		border: 1px solid color-mix(in srgb, var(--border-subtle) 70%, rgba(255, 255, 255, 0.16));
		border-radius: 20px;
		box-shadow: 0 24px 64px -8px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.14);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		pointer-events: auto;
		transition: height 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s;
	}

	.notes-floating-panel:hover {
		box-shadow: 0 28px 72px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 0 0 1px color-mix(in srgb, var(--accent) 10%, transparent);
	}

	:root[data-clear-glass="true"] .notes-floating-panel {
		background: var(--surface-canvas) !important;
		border: 1px solid var(--border-subtle) !important;
		backdrop-filter: none !important;
		-webkit-backdrop-filter: none !important;
	}

	.notes-floating-panel.minimized {
		height: 46px;
	}

	.notes-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.6rem 0.85rem;
		background: color-mix(in srgb, var(--surface-subtle) 85%, transparent);
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
		gap: 0.5rem;
	}

	.notes-panel-title {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--text-secondary);
	}

	.notes-panel-title b {
		font-size: 0.7rem;
		color: var(--text-primary);
		letter-spacing: 0.04em;
	}

	.notes-panel-title .hint-key {
		font-size: 0.6rem;
		color: var(--text-secondary);
		display: none;
	}

	@media (min-width: 640px) {
		.notes-panel-title .hint-key {
			display: inline;
		}
	}

	.notes-panel-title .hint-key kbd {
		padding: 0.05rem 0.25rem;
		background: var(--surface-canvas);
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		font-weight: 700;
		font-size: 0.58rem;
	}

	.notes-panel-controls {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.btn-minimize,
	.btn-close-panel {
		width: 26px;
		height: 26px;
		border-radius: 7px;
		background: transparent;
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		cursor: pointer;
		display: grid;
		place-items: center;
		transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.btn-minimize:hover {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: var(--accent);
		transform: scale(1.12);
	}

	.btn-close-panel:hover {
		background: color-mix(in srgb, #ef4444 12%, transparent);
		color: #ef4444;
		border-color: #ef4444;
		transform: rotate(90deg) scale(1.1);
	}

	.notes-panel-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.notes-minimized-preview {
		flex: 1;
		padding: 0.6rem 0.85rem;
		cursor: pointer;
		overflow: hidden;
	}

	.notes-minimized-preview .preview-text {
		margin: 0;
		font-size: 0.72rem;
		color: var(--text-secondary);
		line-height: 1.4;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.notes-minimized-preview .preview-text.muted {
		font-style: italic;
		opacity: 0.6;
	}

	.notes-textarea {
		width: 100%;
		height: 100%;
		padding: 0.85rem;
		background: transparent;
		border: none;
		outline: none;
		color: var(--text-primary);
		font-size: 0.78rem;
		line-height: 1.55;
		resize: none;
		box-sizing: border-box;
	}

	.notes-preview-render {
		width: 100%;
		height: 100%;
		padding: 0.85rem;
		overflow-y: auto;
		color: var(--text-primary);
		font-size: 0.8rem;
		line-height: 1.55;
		box-sizing: border-box;
	}

	.notes-preview-render :global(.timestamp-chip) {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		background: color-mix(in srgb, #ef4444 15%, transparent);
		color: #f87171;
		border: 1px solid color-mix(in srgb, #ef4444 35%, transparent);
		border-radius: 6px;
		padding: 0.08rem 0.4rem;
		font-size: 0.72rem;
		font-weight: 800;
		font-family: inherit;
		cursor: pointer;
		margin: 0.1rem 0.2rem;
		transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.notes-preview-render :global(.timestamp-chip:hover) {
		background: #ef4444;
		color: #ffffff;
		transform: scale(1.08);
		box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
	}

	.stamp-chip-btn {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		border-radius: 7px;
		padding: 0.2rem 0.5rem;
		font-size: 0.66rem;
		font-weight: 750;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.stamp-chip-btn:hover {
		transform: scale(1.06);
		box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.stamp-chip-btn:active,
	.stamp-chip-btn.stamp-flash {
		transform: scale(0.92);
	}

	.btn-preview-toggle {
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		border-radius: 7px;
		padding: 0.2rem 0.5rem;
		font-size: 0.66rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-preview-toggle.active {
		background: var(--accent);
		color: #ffffff;
		border-color: var(--accent);
	}

	/* ── Dead old styles (hidden) ── */
	.notes-container,
	.notes-header,
	.notes-title-group,
	.notes-actions,
	.notes-body,
	.layout-toggle-group {
		display: none;
	}

	@media (max-width: 900px) {
		.theater-modal {
			inset: 0.5rem;
		}

		.notes-floating-panel {
			width: min(calc(100vw - 3rem), 380px);
			height: min(520px, calc(100dvh - 10rem));
			bottom: 0.75rem;
			right: 0.75rem;
		}
	}
</style>
