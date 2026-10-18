<svelte:window on:keydown={handleKey} />
<svelte:head><title>Settings · BTracker</title></svelte:head>

<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import {
		tracker, updateTracker, replaceTracker, celebration, targetsModalOpen,
		setProfileName, setExamDate, setWeeklyGoalHours, setStreakGoalHours
	} from '$lib/stores/tracker';
	import { createInitialTrackerState } from '$lib/state/defaults';
	import { mergeImportedProgress } from '$lib/state/legacy-progress';
	import { importLegacyCode } from '$lib/state/legacy-code';
	import { parseImportedProgress } from '$lib/services/progressImport';
	import { longDateKey } from '$lib/state/dates';
	import { onMount, onDestroy } from 'svelte';
	import { THEME_PRESETS, presetOf, isDarkTheme, syncThemeWallpaper, isBuiltinWallpaper, resolveLiveWallpaper, resolveEcoMode, isMobileDevice } from '$lib/state/themes';
	import { unlockCtx } from '$lib/stores/cosmetics';
	
	import { itemOf, reqMet, reqLabel, reqStatus, reqProgress, AURORA_REQ, type UnlockCtx } from '$lib/state/cosmetics';
	import { COSMETIC_SLOTS, type Slot } from '$lib/state/cosmetics';

	import type { ThemeId, TrackerState, StateSnapshot, DashboardLayout } from '$lib/types/tracker';
	import { takeSnapshot, listSnapshots, restoreSnapshot, deleteSnapshot } from '$lib/services/persistence';
	import CosmeticsModal from '$lib/components/cosmetics/CosmeticsModal.svelte';
	import DashboardPreviewModal from '$lib/components/dashboard/DashboardPreviewModal.svelte';

	const ACCENTS = ['#6d5dfc', '#e0455a', '#d99a2b', '#2f9e6e', '#2b8ba6', '#8b7bff', '#ff5c8a', '#b44df0'];
	const THEMES = THEME_PRESETS;

	let cosmeticsModalOpen = false;
	let layoutPreviewOpen = false;
	let previewLayout: DashboardLayout = 'default';

	function openLayoutPreview(layout: DashboardLayout) {
		previewLayout = layout;
		layoutPreviewOpen = true;
	}

	const LAYOUT_OPTIONS: Array<{ id: DashboardLayout; label: string; desc: string }> = [
		{
			id: 'default',
			label: 'Default',
			desc: 'Balanced 3-column classic dashboard with full widget coverage.'
		},
		{
			id: 'minimalist',
			label: 'Minimalist',
			desc: 'Flat & inline, borderless 2-column flow with thin 1px dividers.'
		},
		{
			id: 'focus',
			label: 'Focus',
			desc: '70/30 asymmetric split prioritizing timer & active tasks.'
		}
	];

	function setLayout(layout: DashboardLayout) {
		updateTracker((s) => {
			s.ui.dashboardLayout = layout;
		});
		celebration.set(`Switched dashboard layout to ${layout.charAt(0).toUpperCase() + layout.slice(1)}.`);
	}

	
	let devKeys = '';
	function handleKey(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		devKeys += e.key;
		if (devKeys.length > 20) devKeys = devKeys.slice(-20);
		if (devKeys.toLowerCase().includes('unlockall')) {
			devKeys = '';
			updateTracker(s => { s.ui.devMode = !s.ui.devMode; });
			celebration.set($tracker.ui.devMode ? 'Developer Mode activated! All cosmetics unlocked.' : 'Developer Mode disabled.');
		} else if (devKeys.toLowerCase().includes('targets') || devKeys.toLowerCase().includes('target')) {
			devKeys = '';
			targetsModalOpen.set(true);
			celebration.set('🎯 Opening JEE Target Setup Wizard…');
		}
	}

	let nameDraft = $tracker.meta.name;

	let previewModalOpen = false;
	let selectedLockedTheme: any = null;
	
	let previewActive = false;
	let previewTimeLeft = 0;
	let previewInterval: any;
	let originalTheme = 'dark';
	let originalAccent = '#6d5dfc';

	function handleThemeClick(t: any) {
		if (canUseTheme(t.id, $unlockCtx)) {
			setTheme(t.id);
		} else {
			selectedLockedTheme = t;
			previewModalOpen = true;
		}
	}

	function startPreview() {
		if (!selectedLockedTheme) return;
		originalTheme = $tracker.theme;
		originalAccent = $tracker.ui.accent;
		originalWallpaper = $tracker.ui.wallpaper ?? null;

		updateTracker(s => {
			s.theme = selectedLockedTheme.id;
			s.ui.accent = selectedLockedTheme.accent;
			if (selectedLockedTheme.wallpaper) s.ui.wallpaper = 'builtin:' + selectedLockedTheme.id;
		});

		previewModalOpen = false;
		previewActive = true;
		previewTimeLeft = 60;

		clearInterval(previewInterval);
		previewInterval = setInterval(() => {
			previewTimeLeft -= 1;
			if (previewTimeLeft <= 0) {
				endPreview();
			}
		}, 1000);
	}

	let originalWallpaper: string | null = null;

	function endPreview() {
		clearInterval(previewInterval);
		if (previewActive) {
			updateTracker(s => {
				s.theme = originalTheme as any;
				s.ui.accent = originalAccent;
				s.ui.wallpaper = originalWallpaper;
			});
			previewActive = false;
			// Re-open the modal to show requirements after preview ends
			previewModalOpen = true;
		}
	}

	// Restore the real theme if the page unmounts mid-preview (nav or HMR)
	onDestroy(() => {
		if (previewActive) {
			previewActive = false;
			updateTracker(s => {
				s.theme = originalTheme as any;
				s.ui.accent = originalAccent;
				s.ui.wallpaper = originalWallpaper;
			});
		}
	});
	
	$: isSpecialTheme = $tracker.theme === 'god-mode' || $tracker.theme === 'challenger' || $tracker.theme === 'initiate' || $tracker.theme === 'master';

	function canUseTheme(themeId: string, ctx: UnlockCtx) {
		return reqMet(presetOf(themeId).unlock, ctx);
	}

	$: equipped = $tracker.ui.cosmetics ?? {};
	function equip(slot: Slot, id: string | undefined) {
		const item = itemOf(slot, id);
		if (item && !reqMet(item.unlock, $unlockCtx)) {
			celebration.set(`${item.label} locked — needs ${reqLabel(item.unlock!)}.`);
			return;
		}
		updateTracker((s) => {
			const next = { ...s.ui.cosmetics };
			if (id === undefined) delete next[slot];
			else next[slot] = id;
			s.ui.cosmetics = next;
			if (slot === 'wallpaper') syncThemeWallpaper(s);
		});
	}
	function setAurora(on: boolean) {
		updateTracker((s) => { s.ui.cosmetics = { ...s.ui.cosmetics, aurora: on }; });
	}

	let confirmClear = false;


	function handleWallpaperUpload(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		if (!file) return;
		
		if (file.type.startsWith('video/')) {
			if (file.size > 25 * 1024 * 1024) {
				alert('Live wallpaper video must be under 25MB.');
				return;
			}
			const reader = new FileReader();
			reader.onload = (event) => {
				const data = event.target?.result as string;
				updateTracker(s => { 
					s.ui.wallpaper = data; 
					s.ui.liveWallpaper = true;
					s.ui.ecoMode = false;
					if (!s.ui.wallpaperHistory) s.ui.wallpaperHistory = [];
					if (!s.ui.wallpaperHistory.includes(data)) {
						s.ui.wallpaperHistory = [data, ...s.ui.wallpaperHistory].slice(0, 10);
					}
				});
				celebration.set('Live wallpaper applied!');
			};
			reader.readAsDataURL(file);
			return;
		}
		
		const reader = new FileReader();

		reader.onload = (event) => {
			const data = event.target?.result as string;
			const img = new Image();
			img.onload = () => {
				// Compress the image so we don't blow up IndexedDB storage
				const canvas = document.createElement('canvas');
				let width = img.width;
				let height = img.height;
				const MAX = 1920; // Max HD resolution for wallpapers
				
				if (width > height && width > MAX) {
					height *= MAX / width; width = MAX;
				} else if (height > MAX) {
					width *= MAX / height; height = MAX;
				}
				
				canvas.width = width; canvas.height = height;
				const ctx = canvas.getContext('2d');
				if (!ctx) return;
				ctx.drawImage(img, 0, 0, width, height);
				
				// Export as compressed JPEG
				const compressed = canvas.toDataURL('image/jpeg', 0.85);
				updateTracker(s => { 
					s.ui.wallpaper = compressed; 
					if (!s.ui.wallpaperHistory) s.ui.wallpaperHistory = [];
					if (!s.ui.wallpaperHistory.includes(compressed)) {
						s.ui.wallpaperHistory = [compressed, ...s.ui.wallpaperHistory].slice(0, 10);
					}
				});
				celebration.set('Wallpaper uploaded and compressed successfully!');
			};
			img.src = data;
		};
		reader.readAsDataURL(file);
	}


	$: if (typeof document !== 'undefined' && $tracker.meta.name !== nameDraft.trim() && document.activeElement?.tagName !== 'INPUT') nameDraft = $tracker.meta.name;

	function commitName() { setProfileName(nameDraft.trim()); }
	function setTheme(id: ThemeId) {
		const preset = presetOf(id);
		updateTracker((s) => {
			s.theme = id;
			s.ui.accent = preset.accent;
			if (preset.wallpaper?.endsWith('.mp4')) {
				s.ui.liveWallpaper = true;
				s.ui.ecoMode = false;
			}
			syncThemeWallpaper(s);
		});
	}
	function setAccent(color: string) { updateTracker((s) => { s.ui.accent = color; }); }
	function setWallpaper(url: string | null) {
		updateTracker(s => {
			s.ui.wallpaper = url;
			if (url && (url.endsWith('.mp4') || url.endsWith('.webm') || url.startsWith('data:video'))) {
				s.ui.liveWallpaper = true;
				s.ui.ecoMode = false;
			}
			if (url && !url.startsWith('data:')) {
				if (!s.ui.wallpaperHistory) s.ui.wallpaperHistory = [];
				if (!s.ui.wallpaperHistory.includes(url)) {
						s.ui.wallpaperHistory = [url, ...s.ui.wallpaperHistory].slice(0, 10);
				}
			}
		});
	}
	
	function removeWallpaperFromHistory(url: string) {
		updateTracker(s => {
			if (s.ui.wallpaperHistory) {
				s.ui.wallpaperHistory = s.ui.wallpaperHistory.filter(u => u !== url);
			}
			if (s.ui.wallpaper === url) {
				s.ui.wallpaper = null;
			}
		});
	}
	
	let urlDraft = '';
	$: if (typeof document !== 'undefined' && $tracker.ui.wallpaper && !isBuiltinWallpaper($tracker.ui.wallpaper) && !$tracker.ui.wallpaper.startsWith('data:')) {
		urlDraft = $tracker.ui.wallpaper;
	}


	let analysisTimer: ReturnType<typeof setTimeout>;
	function analyzeWallpaper(url: string | null) {
		if (!url || isBuiltinWallpaper(url)) return;
		clearTimeout(analysisTimer);
		analysisTimer = setTimeout(() => {
			console.log('Analyzing wallpaper:', url);
			const img = new Image();
			img.crossOrigin = 'Anonymous';
			
			// Try using a fast, public CORS proxy if the internal one fails, or just use it directly
			// Using corsproxy.io because it handles almost all image headers perfectly
			// Since this is a Tauri app (static build), local SvelteKit API routes don't exist at runtime!
			// We MUST use a reliable public image proxy that guarantees CORS headers for canvas manipulation.
			img.src = url.startsWith("data:") ? url : `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&w=128&h=128&fit=cover`;
			
			img.onload = () => {
				console.log('Image loaded successfully');
				try {
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d');
					canvas.width = 64; canvas.height = 64;
					if (!ctx) return;
					ctx.drawImage(img, 0, 0, 64, 64);
					const data = ctx.getImageData(0, 0, 64, 64).data;
					let r = 0, g = 0, b = 0, count = 0;
					for (let i = 0; i < data.length; i += 16) {
						r += data[i]; g += data[i + 1]; b += data[i + 2];
						count++;
					}
					r /= count; g /= count; b /= count;
					const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
					const isDark = luminance < 128;
					console.log('Luminance:', luminance, 'isDark:', isDark);
					
					const currentIsDark = isDarkTheme($tracker.theme);
					if (isDark && !currentIsDark) {
						setTheme('dark');
						celebration.set('Auto-switched to Dark Theme for dark wallpaper!');
					} else if (!isDark && currentIsDark) {
						setTheme('light');
						celebration.set('Auto-switched to Light Theme for light wallpaper!');
					}
				} catch (e) {
					console.error('Canvas manipulation failed:', e);
				}
			};
			img.onerror = (e) => {
				console.error('Image load failed for analysis:', e);
			};
		}, 800);
	}

	$: if (browser && $tracker.ui.wallpaper) {
		analyzeWallpaper($tracker.ui.wallpaper);
	}


	function exportData() {
		const blob = new Blob([JSON.stringify($tracker, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `btracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
		celebration.set('Backup exported!');
	}

	function importData(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			input.value = '';
			try {
				const parsed = JSON.parse(String(reader.result)) as Partial<TrackerState>;
				replaceTracker({ ...createInitialTrackerState(), ...parsed });
				celebration.set('Backup restored!');
			} catch { celebration.set('Invalid backup file'); }
		};
		reader.onerror = () => { input.value = ''; celebration.set('Could not read that file'); };
		reader.readAsText(file);
	}

	let snapshots: Omit<StateSnapshot, 'state'>[] = [];
	let snapshotLoading = false;
	let restoreConfirmSnap: Omit<StateSnapshot, 'state'> | null = null;

	async function loadSnapshots() {
		if (browser) snapshots = await listSnapshots();
	}

	async function handleCreateSnapshot() {
		snapshotLoading = true;
		try {
			await takeSnapshot($tracker, undefined, 'Manual');
			await loadSnapshots();
			celebration.set('Local Snapshot saved successfully!');
		} finally {
			snapshotLoading = false;
		}
	}

	async function handleRestoreSnapshot(snap: Omit<StateSnapshot, 'state'>) {
		const restored = await restoreSnapshot(snap.id);
		if (restored) {
			replaceTracker(restored);
			restoreConfirmSnap = null;
			celebration.set(`Restored snapshot from ${snap.label}!`);
		}
	}

	async function handleDeleteSnapshot(id: string) {
		await deleteSnapshot(id);
		await loadSnapshots();
	}

	onMount(() => {
		void loadSnapshots();
	});

	let legacyCode = '';
	let legacyError = '';

	async function loadCodeFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		legacyError = '';
		try {
			legacyCode = await file.text();
		} catch {
			input.value = '';
			legacyError = 'Could not read that file — pick it again, or paste the code instead.';
			return;
		}
		input.value = '';
		if (!legacyCode.trim()) {
			legacyError = 'That file is empty — pick the .txt the old tracker downloaded.';
			return;
		}
		importCode();
	}

	function importCode() {
		legacyError = '';
		try {
			const input = legacyCode.trim();
			// Saved .txt files can carry wrapper text or NUL bytes (UTF-16 re-saves),
			// so find the "JEE-" marker instead of trusting the first characters.
			const compact = input.replaceAll(/[\s\u0000]+/g, '');
			const jeeAt = compact.startsWith('{') ? -1 : compact.indexOf('JEE-');
			let next: TrackerState;
			if (jeeAt >= 0) {
				// Old save codes predate the library, todos, reflections, sessions and
				// profile — keep whatever this app already holds in those sections.
				next = {
					...importLegacyCode(compact.slice(jeeAt)),
					ui: $tracker.ui, meta: $tracker.meta, lib: $tracker.lib,
					gt: $tracker.gt, todos: $tracker.todos, deletedTodos: $tracker.deletedTodos, chapterGrids: $tracker.chapterGrids, refl: $tracker.refl, sess: $tracker.sess
				};
			} else {
				next = mergeImportedProgress(parseImportedProgress<Partial<TrackerState>>(input), $tracker);
			}
			replaceTracker(next);
			legacyCode = '';
			celebration.set('Progress imported from old tracker!');
		} catch (error) {
			legacyError = error instanceof Error ? error.message : 'Import failed.';
		}
	}

	function clearAll() {
		replaceTracker(createInitialTrackerState());
		confirmClear = false;
		celebration.set('All data cleared');
	}
</script>

<section class="settings">
	<header>
		<h1>Settings</h1>
		<p>PROFILE, APPEARANCE &amp; DATA</p>
	</header>

	<div class="panels">
	<div class="settings-col">
		<!-- 1. Profile -->
		<div class="panel">
			<h2><NavIcon name="settings" size={15} /> Profile</h2>
			<label class="field">
				<span>USERNAME</span>
				<input type="text" placeholder="Your name" bind:value={nameDraft} on:blur={commitName} />
			</label>
			<label class="field">
				<span>TARGET EXAM DATE</span>
				<input type="date" value={$tracker.meta.exam ?? ''} on:change={(e) => setExamDate(e.currentTarget.value || null)} />
			</label>
			{#if $tracker.meta.exam}
				<p class="hint">Countdown target: {longDateKey($tracker.meta.exam)} · exam at 09:00 AM.</p>
			{/if}
			<div class="row">
				<label class="field">
					<span>WEEKLY GOAL (H)</span>
					<input type="number" min="1" max="500" value={$tracker.meta.weekGoalH} on:change={(e) => setWeeklyGoalHours(Number(e.currentTarget.value))} />
				</label>
				<label class="field">
					<span>STREAK GOAL (H/DAY)</span>
					<input type="number" min="1" max="24" value={$tracker.meta.streakGoalH} on:change={(e) => setStreakGoalHours(Number(e.currentTarget.value))} />
				</label>
			</div>
			<div style="margin-top: 1.1rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: gap;">
				<div>
					<b style="display: block; font-size: 0.88rem; color: var(--text-primary);">JEE Target Setup Wizard</b>
					<small style="color: var(--text-secondary); font-size: 0.74rem;">Re-run the full targets questionnaire (or type dev key: <code>targets</code>)</small>
				</div>
				<button type="button" class="btn accent" style="padding: 0.5rem 1rem; font-size: 0.8rem;" on:click={() => targetsModalOpen.set(true)}>
					<NavIcon name="target" size={14} /> Open Targets
				</button>
			</div>
		</div>

		<!-- 2. Appearance -->
		<div class="panel">
			<h2><NavIcon name="palette" size={15} /> Appearance</h2>
			
			<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
				<p class="label" style="margin: 0;">ACCENT COLOR</p>
				<span style="font-size: 0.75rem; font-weight: 700; color: var(--accent); background: color-mix(in srgb, var(--accent) 15%, transparent); padding: 0.2rem 0.6rem; border-radius: 99px;">Preview</span>
			</div>
			<div class="swatches">
				{#each ACCENTS as color, i (i)}
					<button type="button" class="swatch" class:on={$tracker.ui.accent === color} style="background: {color}" aria-label="Accent {color}" on:click={() => setAccent(color)}></button>
				{/each}
				<label class="swatch custom" title="Custom color">
					<input type="color" value={$tracker.ui.accent} on:input={(e) => setAccent(e.currentTarget.value)} />
				</label>
			</div>

			<div class="theme-header-row">
				<p class="label" style="margin: 0;">THEME</p>
				<button type="button" class="btn-theme-gear" id="cosmetics" title="Cosmetics Loadout" on:click={() => (cosmeticsModalOpen = true)}>
					<NavIcon name="sparkles" size={13} />
					<span>Customize Loadout</span>
				</button>
			</div>
			<div class="themes">
				{#each THEMES as t, i (i)}
					{@const usable = canUseTheme(t.id, $unlockCtx)}
					<button type="button"
						class="theme {usable ? '' : 'locked'} {t.unlock && usable ? 'tier-unlocked' : ''}"
						class:on={$tracker.theme === t.id}
						on:click={() => handleThemeClick(t)}>
						<span class="theme-top">
							{#if !usable}<NavIcon name="lock" size={14} />
							{:else if t.unlock}<NavIcon name="sparkles" size={14} />
							{:else}<NavIcon name={t.dark ? 'moon' : 'sun'} size={14} />{/if}
							{t.label}
						</span>
						{#if t.unlock && !usable}
							<span class="unlock-track"><i style="width: {Math.round(reqProgress(t.unlock, $unlockCtx) * 100)}%"></i></span>
							<small class="unlock-copy">{reqStatus(t.unlock, $unlockCtx)}{t.unlock.kind === 'subject' ? ` · ${t.unlock.sub === 'P' ? 'Physics' : t.unlock.sub === 'C' ? 'Chemistry' : 'Maths'}` : ''}</small>
						{/if}
					</button>
				{/each}
			</div>

			<label class="check">
				<input type="checkbox" checked={$tracker.ui.reducedMotion} on:change={(e) => { const v = e.currentTarget.checked; updateTracker((s) => { s.ui.reducedMotion = v; }); }} />
				<span>Reduce motion</span>
				<small>Tones down transitions and animations.</small>
			</label>
		</div>

		<!-- 3. Wallpaper & Glass -->
		<div class="panel">
			<h2><NavIcon name="tv" size={15} /> Wallpaper & Glass</h2>

			<p class="muted">Add a background image URL, or upload one from your computer. Works best with abstract or aesthetic backgrounds.</p>

			<label class="check" style="margin-bottom: 0.75rem;">
				<input
					type="checkbox"
					checked={resolveLiveWallpaper($tracker.ui.liveWallpaper)}
					on:change={(e) => {
						const checked = e.currentTarget.checked;
						updateTracker((s) => {
							s.ui.liveWallpaper = checked;
							if (checked) s.ui.ecoMode = false;
							syncThemeWallpaper(s);
						});
						celebration.set(checked ? 'Live wallpapers enabled.' : 'Live wallpapers disabled (lightweight mode).');
					}}
				/>
				<span>
					<strong>Live Video Wallpapers</strong><br/>
					Enable dynamic animated video wallpapers. Default: On for laptops, off for mobile to ensure fast loading and save battery.
				</span>
			</label>

			<label class="check" style="margin-bottom: 1.1rem;">
				<input
					type="checkbox"
					checked={resolveEcoMode($tracker.ui.ecoMode)}
					on:change={(e) => {
						const checked = e.currentTarget.checked;
						updateTracker((s) => { s.ui.ecoMode = checked; });
						celebration.set(checked ? 'Eco Mode active (Battery saver & smooth 60fps).' : 'Eco Mode disabled (Full effects).');
					}}
				/>
				<span>
					<strong>Eco Mode (Battery Saver)</strong><br/>
					Pauses aurora drift and heavy glass blurs for peak speed and battery efficiency. Default: On for mobile, off for laptops.
				</span>
			</label>
			
			<div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
				<input type="url" placeholder="https://example.com/wallpaper.jpg" class="input" style="margin-bottom: 0;" bind:value={urlDraft} on:change={() => setWallpaper(urlDraft || null)} />
				
				<label class="btn solid" style="white-space: nowrap; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; gap: 0.4rem;">
					<NavIcon name="plus" size={15} /> Upload
					<input type="file" accept="image/*, video/mp4, video/webm" style="display: none;" on:change={handleWallpaperUpload} />
				</label>
				{#if $tracker.ui.wallpaper}
					<button type="button" class="btn ghost danger" style="padding: 0 .6rem;" aria-label="Remove wallpaper" on:click={() => updateTracker(s => { s.ui.wallpaper = null; })}>
						<NavIcon name="trash" size={15} />
					</button>
				{/if}
			</div>

			{#if $tracker.ui.wallpaperHistory && $tracker.ui.wallpaperHistory.length > 0}
				<div class="wallpaper-history">
					{#each $tracker.ui.wallpaperHistory as wp, i (i)}
						<div class="hist-item" class:active={$tracker.ui.wallpaper === wp} on:click={() => updateTracker(s => { s.ui.wallpaper = wp; })} on:keydown={(e) => e.key === 'Enter' && updateTracker(s => { s.ui.wallpaper = wp; })} tabindex="0" role="button">
							{#if wp.startsWith('data:video')}<video class="thumb" src={wp} muted loop autoplay style="object-fit: cover; width: 100%; height: 100%; border-radius: 8px;"></video>{:else}<div class="thumb" style="background-image: url({wp})"></div>{/if}
							<button type="button" class="del-btn" on:click|stopPropagation={() => removeWallpaperFromHistory(wp)}>
								<NavIcon name="x" size={10} />
							</button>
						</div>
					{/each}
				</div>
			{/if}

			<div style="margin-top: 1.2rem;">
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
					<p class="label" style="margin: 0;">GLASS OPACITY</p>
					<span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 700;">{$tracker.ui.glassStrength ||($tracker.ui.glassStrength ?? 45)}%</span>
				</div>
				<input 
					type="range" 
					min="0" 
					max="100" 
					value={($tracker.ui.glassStrength ?? 45)} 
					on:input={(e) => {
						const val = parseInt(e.currentTarget.value);
						updateTracker(s => { s.ui.glassStrength = val; });
					}}
					style="width: 100%; accent-color: var(--accent);"
				/>
				<p class="muted" style="margin-top: 0.3rem;">Lower for clear glass, higher for solid legibility.</p>
			</div>

			<!-- Apple VisionOS / Smoked Acrylic Lighting (Phase 2) -->
			<div class="vision-feature-card" style="margin-top: 1.25rem;">
				<div class="vision-feature-head">
					<span class="vision-pill">PHASE 2 ACTIVE</span>
					<p class="label" style="margin: 0; display: inline-flex; align-items: center; gap: 0.35rem;">
						✨ Apple VisionOS Smoked Glass & Specular Glow
					</p>
				</div>
				<p class="muted" style="margin: 0.35rem 0 0; font-size: 0.76rem; line-height: 1.5;">
					Multi-layer smoked acrylic with precision chamfered inner bevels and real-time interactive cursor beam tracking across cards.
				</p>
			</div>
		</div>
	</div>

	<div class="settings-col">
		<!-- 4. Dashboard Layout -->
		<div class="panel">
			<h2><NavIcon name="grid" size={15} /> Dashboard Layout</h2>
			<p class="muted">Choose your preferred workspace structure. Switches instantaneously without disrupting active timers or tasks.</p>
			<div class="layout-grid">
				{#each LAYOUT_OPTIONS as opt (opt.id)}
					<div
						role="button"
						tabindex="0"
						class="layout-card"
						class:on={($tracker.ui?.dashboardLayout || 'default') === opt.id}
						on:click={() => setLayout(opt.id)}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								setLayout(opt.id);
							}
						}}
					>
						<div class="layout-wireframe wireframe-{opt.id}">
							{#if opt.id === 'default'}
								<div class="wf-col wf-col-main"></div>
								<div class="wf-col wf-col-side"></div>
							{:else if opt.id === 'minimalist'}
								<div class="wf-topbar"></div>
								<div class="wf-row">
									<div class="wf-cell"></div>
									<div class="wf-cell"></div>
								</div>
								<div class="wf-bottombar"></div>
							{:else if opt.id === 'focus'}
								<div class="wf-row wf-focus-row">
									<div class="wf-hero"></div>
									<div class="wf-rail">
										<div></div>
										<div></div>
									</div>
								</div>
							{/if}
						</div>
						<div class="layout-card-info">
							<div class="layout-card-title">
								<span class="layout-name">{opt.label}</span>
								{#if ($tracker.ui?.dashboardLayout || 'default') === opt.id}
									<span class="layout-active-badge">Active</span>
								{/if}
							</div>
							<p class="layout-desc">{opt.desc}</p>
							<button
								type="button"
								class="btn-card-preview"
								title="Live Preview of {opt.label} Layout"
								on:click|stopPropagation={() => openLayoutPreview(opt.id)}
							>
								<NavIcon name="tv" size={12} />
								<span>Preview Layout</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- 5. Feedback & Feel -->
		<div class="panel">
			<h2><NavIcon name="bolt" size={15} /> Feedback & Feel</h2>
			<p class="sub">Native app interactions and feedback.</p>
			<label class="check">
				<input type="checkbox" checked={$tracker.ui.haptics ?? true} on:change={(e) => updateTracker(s => { s.ui.haptics = e.currentTarget.checked; })} />
				<span><strong>Haptic Feedback</strong><br/>Physical vibrations on mobile devices</span>
			</label>
			<label class="check">
				<input type="checkbox" checked={$tracker.ui.sounds ?? true} on:change={(e) => updateTracker(s => { s.ui.sounds = e.currentTarget.checked; })} />
				<span><strong>Micro-Sounds</strong><br/>Subtle UI audio pops and clicks</span>
			</label>
		</div>

		<!-- 6. Focus Gamification -->
		<div class="panel">
			<h2><NavIcon name="brain" size={15} /> Focus Gamification</h2>
			<p class="muted">Choose a visual companion to sit in the center of your deep work timer.</p>
			<div class="cos-grid">
				<button type="button" class="cos" class:on={($tracker.settings?.focusPet || 'orb') === 'orb'} on:click={() => updateTracker(s => { s.settings = s.settings || {}; s.settings.focusPet = 'orb'; })}>
					<span>Orb</span>
				</button>
				<button type="button" class="cos" class:on={$tracker.settings?.focusPet === 'crystal'} on:click={() => updateTracker(s => { s.settings = s.settings || {}; s.settings.focusPet = 'crystal'; })}>
					<span>Crystal</span>
				</button>
				<button type="button" class="cos" class:on={$tracker.settings?.focusPet === 'flame'} on:click={() => updateTracker(s => { s.settings = s.settings || {}; s.settings.focusPet = 'flame'; })}>
					<span>Flame</span>
				</button>
			</div>
		</div>

		<!-- 7. Data & Local Snapshot Vault -->
		<div class="panel">
			<h2><NavIcon name="shield" size={15} /> Data</h2>
			<p class="muted">Everything lives locally in your browser (IndexedDB). Backups are plain JSON files.</p>
			<div class="data-actions">
				<button type="button" class="btn" on:click={exportData}><NavIcon name="download" size={14} /> Export backup</button>
				<label class="btn"><NavIcon name="save" size={14} /> Import backup<input type="file" accept="application/json,.json" hidden on:change={importData} /></label>
				<button type="button" class="btn danger" on:click={() => (confirmClear = true)}><NavIcon name="trash" size={14} /> Clear all data</button>
			</div>

			<!-- Local Snapshot Vault -->
			<div class="snapshot-vault">
				<div class="vault-head">
					<div>
						<p class="label" style="margin: 0; display: flex; align-items: center; gap: 0.35rem;">
							<NavIcon name="shield" size={12} /> LOCAL SNAPSHOT VAULT
						</p>
						<p class="muted" style="margin: 0.2rem 0 0; font-size: 0.74rem;">
							Rolling restore points stored safely in IndexedDB.
						</p>
					</div>
					<button type="button" class="btn-snap-create" disabled={snapshotLoading} on:click={handleCreateSnapshot}>
						<NavIcon name="plus" size={12} /> {snapshotLoading ? 'Saving...' : 'New Snapshot'}
					</button>
				</div>

				{#if snapshots.length === 0}
					<div class="snap-empty">
						<span>No snapshots saved yet. Auto-snapshots are taken every 30 mins while studying.</span>
					</div>
				{:else}
					<div class="snap-list">
						{#each snapshots as snap (snap.id)}
							<div class="snap-row">
								<div class="snap-info">
									<div class="snap-top">
										<b>{snap.label}</b>
										<span class="snap-tag {snap.reason === 'Manual' ? 'manual' : 'auto'}">{snap.reason}</span>
									</div>
									<div class="snap-sub">
										<span>🎯 {snap.questionCount} Questions</span>
										{#if snap.testCount > 0}<span>• 📝 {snap.testCount} tests</span>{/if}
									</div>
								</div>
								<div class="snap-btns">
									<button type="button" class="btn-snap-restore" on:click={() => (restoreConfirmSnap = snap)}>
										<NavIcon name="history" size={12} /> Restore
									</button>
									<button type="button" class="btn-snap-del" title="Delete snapshot" on:click={() => handleDeleteSnapshot(snap.id)}>
										<NavIcon name="trash" size={12} />
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<p class="label legacy-label">IMPORT FROM OLD TRACKER</p>
			<p class="muted">Paste the export code from the old site (or open the .txt file it downloaded), then import. Matching sections — syllabus progress, homework, tests, notes, goals — replace the current ones; your profile, to-dos, reflections and sessions stay untouched.</p>
			<textarea
				class="code-area"
				rows="4"
				placeholder="Paste the old tracker's export code here…"
				bind:value={legacyCode}
				on:input={() => (legacyError = '')}
			></textarea>
			{#if legacyError}<p class="warn legacy-error">{legacyError}</p>{/if}
			<div class="legacy-actions">
				<label class="btn"><NavIcon name="save" size={14} /> Open a .txt file<input type="file" accept=".txt,text/plain" hidden on:change={loadCodeFile} /></label>
				<button type="button" class="btn accent" on:click={importCode}><NavIcon name="download" size={14} /> Import code</button>
			</div>
		</div>
	</div>
	</div>
</section>

<CosmeticsModal bind:open={cosmeticsModalOpen} />

<DashboardPreviewModal
	bind:open={layoutPreviewOpen}
	layout={previewLayout}
	on:select={(e) => setLayout(e.detail)}
/>

<Modal bind:open={confirmClear} title="CLEAR ALL DATA?" width="420px">
	<p class="warn">This permanently deletes every session, task, goal, revision plan and test record from this browser. Export a backup first if you might want it later.</p>
	<svelte:fragment slot="footer">
		<button type="button" class="btn" on:click={() => (confirmClear = false)}>Cancel</button>
		<button type="button" class="btn danger" on:click={clearAll}>Delete everything</button>
	</svelte:fragment>
</Modal>

{#if restoreConfirmSnap}
	<Modal open={true} title="RESTORE LOCAL SNAPSHOT" width="440px" on:close={() => (restoreConfirmSnap = null)}>
		<p class="warn">Are you sure you want to restore to snapshot from <b>{restoreConfirmSnap.label}</b>?</p>
		<p class="muted" style="margin-top: 0.4rem;">This will load {restoreConfirmSnap.questionCount} questions and {restoreConfirmSnap.testCount} tests recorded at that point in time.</p>
		<svelte:fragment slot="footer">
			<button type="button" class="btn" on:click={() => (restoreConfirmSnap = null)}>Cancel</button>
			<button type="button" class="btn accent" on:click={() => restoreConfirmSnap && handleRestoreSnapshot(restoreConfirmSnap)}>Restore Now</button>
		</svelte:fragment>
	</Modal>
{/if}


<Modal bind:open={previewModalOpen} title="THEME LOCKED" width="380px">
	{#if selectedLockedTheme}
		<div style="text-align: center; padding: 1rem 0;">
			<NavIcon name="lock" size={48} />
			<h3 style="margin: 1rem 0 0.5rem; color: var(--text-primary)">{selectedLockedTheme.label}</h3>
			<p style="color: var(--text-secondary); margin-bottom: 0.75rem;">{selectedLockedTheme.blurb}</p>
			<p style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.9rem; background: var(--surface-subtle); padding: 0.8rem; border-radius: 8px;">
				Unlocks at <b>{selectedLockedTheme.unlock ? reqLabel(selectedLockedTheme.unlock) : ''}</b><br>
				<span style="color: var(--text-secondary); font-size: 0.78rem;">{selectedLockedTheme.unlock ? `You're at ${reqStatus(selectedLockedTheme.unlock, $unlockCtx)}.` : ''}</span>
			</p>
			{#if selectedLockedTheme.wallpaper}
				<div style="height: 84px; border-radius: 10px; margin-bottom: 1.2rem; border: 1px solid var(--border-subtle); background: {selectedLockedTheme.wallpaper}; background-size: cover;"></div>
			{/if}
			<p style="color: var(--text-primary); font-size: 0.9rem; margin-bottom: 1.5rem; background: var(--surface-subtle); padding: 0.8rem; border-radius: 8px;">
				Want to see what it looks like?<br>You can preview this theme for 60 seconds.
			</p>
		</div>
	{/if}
	<svelte:fragment slot="footer">
		<button type="button" class="btn ghost" on:click={() => previewModalOpen = false}>Close</button>
		<button type="button" class="btn solid" style="--btn: {selectedLockedTheme?.accent || 'var(--accent)'}" on:click={startPreview}>Preview for 60s</button>
	</svelte:fragment>
</Modal>

{#if previewActive}
	<div class="preview-banner" in:fly={{ y: -50, duration: 300 }} out:fade={{ duration: 200 }}>
		<div class="pb-content">
			<span class="pb-icon"><NavIcon name="clock" size={16} /></span>
			<span>Previewing <b>{selectedLockedTheme?.label}</b> — Reverting in <b>{previewTimeLeft}s</b></span>
		</div>
		<button type="button" class="pb-btn" on:click={endPreview}>End Preview</button>
	</div>
{/if}

<style>
	.settings { display: grid; gap: 1.2rem; }
	header h1 { margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -.04em; }
	header p { margin: .3rem 0 0; color: var(--text-secondary); font-size: .64rem; font-weight: 800; letter-spacing: .14em; }

	.panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: 1.2rem; align-items: start; }
	.settings-col { display: flex; flex-direction: column; gap: 1.2rem; }
	.panel {
		padding: 1.3rem 1.4rem;
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: 20px;
		background: var(--vision-glass-bg, var(--surface-panel));
		backdrop-filter: var(--vision-glass-blur, blur(20px));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(20px));
		box-shadow: var(--shadow-card), var(--vision-bevel-inner);
	}
	.panel h2 { display: flex; align-items: center; gap: .5rem; margin: 0 0 1.1rem; font-size: .95rem; font-weight: 800; letter-spacing: -.02em; }
	.panel h2 :global(svg) { color: var(--accent); }

	.vision-feature-card {
		padding: 0.85rem 1rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-subtle));
		border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border-subtle));
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}
	.vision-feature-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.vision-pill {
		font-size: 0.64rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 6px;
		background: var(--accent);
		color: #ffffff;
		box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 50%, transparent);
	}

	.field { display: grid; gap: .35rem; margin-bottom: .9rem; }
	.field span, .label { color: var(--text-secondary); font-size: .62rem; font-weight: 800; letter-spacing: .09em; }
	.label { display: block; margin: 0 0 .5rem; }
	.field input { padding: .65rem .85rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-subtle); color: var(--text-primary); font-size: .85rem; box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05); transition: border-color 0.18s var(--ease-ios-spring); }
	.field input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }


	.row { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
	.hint { margin: -.4rem 0 .9rem; color: var(--text-secondary); font-size: .72rem; }

	.swatches { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1.1rem; }
	.swatch { width: 40px; height: 40px; border: 2px solid transparent; border-radius: 99px; box-shadow: 0 2px 8px rgb(10 8 26 / 20%); transition: transform 0.2s var(--ease-ios-spring); }
	.swatch:active { transform: scale(0.92); }
	.swatch.on { border-color: var(--text-primary); transform: scale(1.12); }
	.swatch.custom { position: relative; display: grid; place-items: center; background: conic-gradient(#e0455a, #d99a2b, #2f9e6e, #2b8ba6, #6d5dfc, #e0455a); overflow: hidden; }
	.swatch.custom input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
	.themes { display: flex; gap: .45rem; flex-wrap: wrap; margin-bottom: 1rem; }
	.input { width: 100%; padding: .7rem; border-radius: 12px; border: 1px solid var(--border-subtle); background: var(--surface-subtle); color: var(--text-primary); font-size: .85rem; margin-bottom: 1rem; box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05); }
	.theme { display: inline-flex; flex-wrap: wrap; align-items: center; gap: .4rem; padding: .55rem .95rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-panel); color: var(--text-secondary); font-size: .76rem; font-weight: 650; text-align: left; transition: all 0.2s var(--ease-ios-spring); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04); cursor: pointer; -webkit-tap-highlight-color: transparent; }
	.theme:active { transform: scale(0.97); }
	.theme.on { color: #fff; border-color: var(--accent); background: var(--accent); box-shadow: 0 4px 12px color-mix(in srgb, var(--accent), transparent 50%), inset 0 1px 0 rgba(255, 255, 255, 0.25); }
	.theme-top { display: inline-flex; align-items: center; gap: .4rem; }
	.tier-unlocked { border-color: color-mix(in srgb, var(--accent), transparent 85%); box-shadow: 0 0 10px color-mix(in srgb, var(--accent), transparent 78%); }
	.unlock-track { flex-basis: 100%; height: 4px; margin-top: .3rem; border-radius: 99px; background: color-mix(in srgb, var(--text-primary), transparent 88%); overflow: hidden; }
	.unlock-track i { display: block; height: 100%; border-radius: 99px; background: var(--accent); transition: width .3s ease; }
	.unlock-copy { flex-basis: 100%; margin-top: .1rem; font-size: .6rem; font-weight: 750; letter-spacing: .05em; color: var(--text-secondary); }
	.check { display: grid; grid-template-columns: auto 1fr; gap: .15rem .55rem; align-items: center; font-size: .84rem; }
	.check input { width: 17px; height: 17px; accent-color: var(--accent); }
	.check small { grid-column: 2; color: var(--text-secondary); font-size: .7rem; }

	.muted { margin: 0 0 1rem; color: var(--text-secondary); font-size: .78rem; line-height: 1.55; }
	.data-actions { display: grid; gap: .55rem; margin-bottom: 1.2rem; }
	.btn { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; padding: .65rem 1rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-panel); color: var(--text-primary); font-size: .82rem; font-weight: 650; cursor: pointer; transition: all 0.18s var(--ease-ios-spring); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05); -webkit-tap-highlight-color: transparent; }
	.btn:hover { border-color: var(--accent); color: var(--accent); }
	.btn:active { transform: scale(0.965); }
	.btn.danger:hover { border-color: var(--danger, #e0455a); color: var(--danger, #e0455a); }
	.btn.accent { border-color: var(--accent); background: var(--accent); color: #fff; box-shadow: 0 3px 10px color-mix(in srgb, var(--accent), transparent 55%), inset 0 1px 0 rgba(255, 255, 255, 0.25); }
	.btn.accent:hover { color: #fff; filter: brightness(1.08); }
	.warn { margin: 0; color: var(--text-secondary); font-size: .84rem; line-height: 1.6; }

	.legacy-label { margin: 0 0 .5rem; padding-top: 1.1rem; border-top: 1px solid var(--border-subtle); }
	.code-area { width: 100%; box-sizing: border-box; margin: 0 0 .7rem; padding: .65rem .75rem; border: 1px solid var(--border-subtle); border-radius: 11px; background: var(--surface-subtle); color: var(--text-primary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .74rem; line-height: 1.5; resize: vertical; }
	.code-area:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
	.legacy-error { margin: -.2rem 0 .7rem; color: var(--danger, #e0455a); font-size: .76rem; }
	.legacy-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; }

	.wallpaper-history { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 8px; scrollbar-width: thin; }
	.hist-item { position: relative; width: 80px; height: 50px; flex-shrink: 0; border-radius: 6px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: all 0.2s ease; }
	.hist-item.active { border-color: var(--accent); transform: scale(1.05); }
	.hist-item .thumb { width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.6; transition: opacity 0.2s ease; }
	.hist-item:hover .thumb, .hist-item.active .thumb { opacity: 1; }
	.hist-item .del-btn { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 4px; padding: 2px; cursor: pointer; opacity: 0; transition: opacity 0.2s ease; display: flex; align-items: center; justify-content: center; }
	.hist-item:hover .del-btn { opacity: 1; }
	.hist-item .del-btn:hover { background: var(--danger); }


.theme.locked { opacity: 0.72; cursor: not-allowed; border-style: dashed; }



	.preview-banner { position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); z-index: 9999; background: var(--surface-panel); border: 1px solid var(--accent); backdrop-filter: var(--glass-filter); -webkit-backdrop-filter: var(--glass-filter); border-radius: 99px; padding: 0.4rem 0.4rem 0.4rem 1.2rem; display: flex; align-items: center; gap: 1.5rem; box-shadow: 0 8px 32px rgba(0,0,0,0.4); color: var(--text-primary); font-size: 0.9rem; }
	.pb-content { display: flex; align-items: center; gap: 0.6rem; }
	.pb-icon { color: var(--accent); display: flex; animation: tick 1s infinite; }
	.pb-btn { background: var(--accent); color: var(--surface-canvas); border: none; padding: 0.4rem 1rem; border-radius: 99px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
	.pb-btn:hover { opacity: 0.9; }
	@keyframes tick { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }



	.cos-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.cos { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem 0.4rem 0.4rem; border: 1px solid var(--border-subtle); border-radius: 99px; background: var(--surface-subtle); color: var(--text-primary); font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
	.cos:hover:not(.locked) { border-color: var(--text-secondary); }
	.cos.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 15%, var(--surface-subtle)); }
	.cos.locked { opacity: 0.6; cursor: not-allowed; background: var(--surface-panel); border-style: dashed; }
	.cos span { display: inline-flex; align-items: center; gap: 0.3rem; }

	.snapshot-vault { margin: 1.1rem 0 1.2rem; padding: 0.95rem 1rem; border-radius: 14px; background: var(--surface-subtle); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 0.75rem; }
	.vault-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
	.btn-snap-create { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.38rem 0.75rem; border-radius: 8px; border: none; background: var(--accent); color: white; font-size: 0.75rem; font-weight: 750; cursor: pointer; }
	.btn-snap-create:disabled { opacity: 0.6; cursor: wait; }
	.snap-empty { font-size: 0.76rem; color: var(--text-secondary); padding: 0.4rem 0; }
	.snap-list { display: flex; flex-direction: column; gap: 0.45rem; max-height: 220px; overflow-y: auto; }
	.snap-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.5rem 0.75rem; border-radius: 9px; background: var(--surface-panel); border: 1px solid var(--border-subtle); }
	.snap-top { display: flex; align-items: center; gap: 0.45rem; }
	.snap-top b { font-size: 0.78rem; color: var(--text-primary); }
	.snap-tag { font-size: 0.62rem; font-weight: 800; padding: 0.1rem 0.4rem; border-radius: 4px; text-transform: uppercase; }
	.snap-tag.manual { background: color-mix(in srgb, var(--accent) 20%, transparent); color: var(--accent); }
	.snap-tag.auto { background: color-mix(in srgb, #10b981 20%, transparent); color: #10b981; }
	.snap-sub { display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.1rem; }
	.snap-btns { display: flex; align-items: center; gap: 0.35rem; }
	.btn-snap-restore { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.65rem; border-radius: 6px; border: 1px solid var(--border-subtle); background: var(--surface-subtle); color: var(--text-primary); font-size: 0.72rem; font-weight: 700; cursor: pointer; }
	.btn-snap-restore:hover { border-color: var(--accent); color: var(--accent); }
	.btn-snap-del { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border-subtle); background: transparent; color: var(--text-secondary); cursor: pointer; }
	.btn-snap-del:hover { color: var(--danger, #e0455a); border-color: var(--danger, #e0455a); }

	.theme-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 1.1rem 0 0.5rem;
	}
	.btn-theme-gear {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem;
		border-radius: 99px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--accent) 10%, var(--surface-subtle));
		color: var(--accent);
		font-size: 0.75rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.2s var(--ease-ios-spring);
	}
	.btn-theme-gear:hover {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 20%, var(--surface-subtle));
		transform: translateY(-1px);
	}
	.btn-theme-gear:active {
		transform: scale(0.96);
	}

	/* Dashboard Layout Options */
	.layout-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}
	@media (max-width: 768px) {
		.layout-grid {
			grid-template-columns: 1fr;
		}
	}
	.layout-card {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		padding: 0.85rem;
		border-radius: 14px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-subtle);
		cursor: pointer;
		text-align: left;
		transition: all 0.2s var(--ease-ios-spring);
		position: relative;
	}
	.layout-card:hover {
		border-color: var(--text-secondary);
		transform: translateY(-1px);
	}
	.layout-card.on {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 10%, var(--surface-subtle));
		box-shadow: 0 0 0 1px var(--accent), 0 4px 14px color-mix(in srgb, var(--accent) 20%, transparent);
	}
	.layout-wireframe {
		width: 100%;
		height: 60px;
		border-radius: 8px;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		box-sizing: border-box;
		overflow: hidden;
	}
	/* Default wireframe */
	.wireframe-default {
		display: flex;
		flex-direction: row;
		gap: 4px;
	}
	.wf-col-main {
		flex: 2;
		background: color-mix(in srgb, var(--accent) 30%, var(--surface-subtle));
		border-radius: 4px;
	}
	.wf-col-side {
		flex: 1;
		background: var(--surface-subtle);
		border-radius: 4px;
	}
	/* Minimalist wireframe */
	.wireframe-minimalist {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.wf-topbar {
		height: 10px;
		background: color-mix(in srgb, var(--accent) 40%, var(--surface-subtle));
		border-radius: 3px;
	}
	.wireframe-minimalist .wf-row {
		display: flex;
		gap: 4px;
		flex: 1;
	}
	.wireframe-minimalist .wf-cell {
		flex: 1;
		background: var(--surface-subtle);
		border-radius: 3px;
	}
	.wf-bottombar {
		height: 8px;
		background: var(--surface-subtle);
		border-radius: 2px;
	}
	/* Focus wireframe */
	.wf-focus-row {
		display: flex;
		gap: 4px;
		height: 100%;
	}
	.wf-hero {
		flex: 7;
		background: color-mix(in srgb, var(--accent) 45%, var(--surface-subtle));
		border-radius: 4px;
	}
	.wf-rail {
		flex: 3;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.wf-rail div {
		flex: 1;
		background: var(--surface-subtle);
		border-radius: 3px;
	}
	.layout-card-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.layout-card-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.layout-name {
		font-size: 0.82rem;
		font-weight: 750;
		color: var(--text-primary);
	}
	.layout-active-badge {
		font-size: 0.62rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 99px;
		background: var(--accent);
		color: #ffffff;
	}
	.layout-desc {
		margin: 0;
		font-size: 0.72rem;
		line-height: 1.35;
		color: var(--text-secondary);
	}
	.btn-card-preview {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.35rem 0.7rem;
		margin-top: 0.4rem;
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-panel));
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 750;
		cursor: pointer;
		transition: all 0.16s ease;
		font-family: inherit;
		width: 100%;
	}
	.btn-card-preview:hover {
		background: color-mix(in srgb, var(--accent) 18%, var(--surface-panel));
		border-color: var(--accent);
		transform: translateY(-1px);
	}
	.btn-card-preview:active {
		transform: scale(0.97);
	}

	@media (max-width: 768px) {
		.panel {
			padding: 1.15rem 1rem;
		}
		.theme-header-row {
			flex-wrap: wrap;
			gap: 0.5rem;
		}
		.vault-head {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		.btn-snap-create {
			width: 100%;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.snap-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		.snap-btns {
			width: 100%;
			justify-content: flex-end;
		}
		.preview-banner {
			width: calc(100% - 1.5rem);
			gap: 0.5rem;
			font-size: 0.76rem;
			padding: 0.35rem 0.35rem 0.35rem 0.75rem;
		}
		.pb-btn {
			padding: 0.35rem 0.75rem;
			font-size: 0.72rem;
		}
	}
</style>
