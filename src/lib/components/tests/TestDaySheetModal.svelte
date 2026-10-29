<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { tracker, updateTracker, celebration } from '$lib/stores/tracker';
	import {
		testDaySheetOpen,
		testDaySheetOptions,
		closeTestDaySheet,
		saveExamNotes,
		type SheetSubject,
		type SheetFormulaSource,
		type SheetColumnLayout,
		type SheetFontSize
	} from '$lib/stores/testDaySheet';
	import { JEE_FORMULAS, type FormulaItem } from '$lib/data/formulas';
	import type { MistakeLog } from '$lib/types/tracker';
	import { uiClick, uiSuccess } from '$lib/utils/feedback';

	export let open = false;

	let katexModule: any = null;
	let renderTick = 0;
	let copiedMarkdown = false;
	let copyTimeout: ReturnType<typeof setTimeout> | undefined;
	let excludeResolved = true;

	$: starredIds = $tracker.starredFormulas || [];

	async function ensureKatex() {
		if (!katexModule) {
			try {
				const mod = await import('katex');
				katexModule = mod.default || mod;
				renderTick++;
			} catch (err) {
				console.warn('Katex dynamic import error:', err);
			}
		}
	}

	$: if (open) {
		ensureKatex();
		if ($tracker.examNotes && !$testDaySheetOptions.examNotes) {
			testDaySheetOptions.update((opt) => ({ ...opt, examNotes: $tracker.examNotes || '' }));
		}
	}

	function renderMath(tex: string, _tick = 0): string {
		if (katexModule) {
			try {
				return katexModule.renderToString(tex, {
					displayMode: false,
					throwOnError: false
				});
			} catch {
				return `<code class="math-fallback">${tex}</code>`;
			}
		}
		return `<code class="math-fallback">${tex}</code>`;
	}

	function toggleStar(id: string) {
		uiClick();
		updateTracker((st) => {
			const list = Array.isArray(st.starredFormulas) ? [...st.starredFormulas] : [];
			if (list.includes(id)) {
				st.starredFormulas = list.filter((x) => x !== id);
			} else {
				st.starredFormulas = [...list, id];
			}
		});
		try {
			localStorage.setItem('btracker_starred_formulas', JSON.stringify($tracker.starredFormulas || []));
		} catch {}
	}

	// Curated exam traps if student has 0 logged mistakes
	const CURATED_EXAM_TRAPS: MistakeLog[] = [
		{
			id: 'trap-1',
			date: Date.now(),
			subject: 'Physics',
			errorType: 'Silly',
			description: 'Sign convention slip in Lens / Mirror formula. Watch coordinate origins and real vs virtual images.',
			testName: 'General Trap'
		},
		{
			id: 'trap-2',
			date: Date.now(),
			subject: 'Physics',
			errorType: 'Formula',
			description: 'Forgot factor of (1 + k²/R²) in total kinetic energy of a rolling body without slipping.',
			testName: 'Rotational Dynamics'
		},
		{
			id: 'trap-3',
			date: Date.now(),
			subject: 'Chemistry',
			errorType: 'Conceptual',
			description: 'Equilibrium constants (Kp, Kc) change ONLY with temperature, not pressure or inert gas addition at constant volume.',
			testName: 'Chemical Equilibrium'
		},
		{
			id: 'trap-4',
			date: Date.now(),
			subject: 'Maths',
			errorType: 'Silly',
			description: 'Always check the domain of log(x) and sqrt(f(x)) before accepting roots in algebraic and trigonometric equations.',
			testName: 'Functions & Calculus'
		},
		{
			id: 'trap-5',
			date: Date.now(),
			subject: 'Maths',
			errorType: 'Time',
			description: 'Spent >5 minutes on a tricky 3D Geometry vector problem. Enforce the 2-minute rule and skip immediately.',
			testName: 'Time Discipline'
		}
	];

	// Filter mistakes based on user options
	$: allMistakes = ($tracker.mistakes && $tracker.mistakes.length > 0) ? $tracker.mistakes : CURATED_EXAM_TRAPS;
	$: isUsingCuratedMistakes = !($tracker.mistakes && $tracker.mistakes.length > 0);

	$: filteredMistakes = allMistakes.filter((m) => {
		if (excludeResolved && m.resolved) {
			return false;
		}
		// Subject match
		if ($testDaySheetOptions.subject !== 'ALL') {
			const sub = m.subject.toLowerCase();
			const target = $testDaySheetOptions.subject.toLowerCase();
			if (!sub.includes(target) && !(target === 'physics' && sub === 'p') && !(target === 'chemistry' && sub === 'c') && !(target === 'maths' && sub === 'm')) {
				return false;
			}
		}
		// Error type match
		if (!$testDaySheetOptions.errorTypes.includes(m.errorType)) {
			return false;
		}
		return true;
	});

	// Filter formulas based on user options (including custom formulas)
	$: allFormulasList = [...JEE_FORMULAS, ...($tracker.customFormulas || [])];

	$: filteredFormulas = allFormulasList.filter((f) => {
		// Subject match
		if ($testDaySheetOptions.subject !== 'ALL') {
			const subCode = $testDaySheetOptions.subject === 'Physics' ? 'P' : $testDaySheetOptions.subject === 'Chemistry' ? 'C' : 'M';
			if (f.subject !== subCode) return false;
		}

		// Source match
		const isStarred = starredIds.includes(f.id);
		const isHighYield = Boolean(f.important);

		if ($testDaySheetOptions.formulaSource === 'starred') {
			return isStarred;
		} else if ($testDaySheetOptions.formulaSource === 'highyield') {
			return isHighYield;
		} else {
			// 'both': starred formulas OR high-yield formulas
			return isStarred || isHighYield;
		}
	});

	// Group formulas by subject and chapter
	interface ChapterFormulaGroup {
		subject: 'P' | 'C' | 'M';
		chapterName: string;
		formulas: FormulaItem[];
	}

	$: groupedFormulas = (() => {
		const map = new Map<string, ChapterFormulaGroup>();
		for (const f of filteredFormulas) {
			const key = `${f.subject}__${f.chapterName}`;
			if (!map.has(key)) {
				map.set(key, {
					subject: f.subject,
					chapterName: f.chapterName,
					formulas: []
				});
			}
			map.get(key)!.formulas.push(f);
		}
		return Array.from(map.values());
	})();

	// Subject stats for summary header
	$: totalMistakesCount = filteredMistakes.length;
	$: totalFormulasCount = filteredFormulas.length;
	$: starredFormulasCount = starredIds.length;

	// Print trigger
	function triggerPrint() {
		uiClick();
		// Give UI a moment to collapse any non-print elements
		tick().then(() => {
			window.print();
		});
	}

	// Copy sheet as Markdown
	async function copyAsMarkdown() {
		uiClick();
		const candidateName = $tracker.meta?.name || 'Aspirant';
		const targetDate = $tracker.meta?.exam ? `Target Exam: ${$tracker.meta.exam}` : 'Exam Day';
		const dateFormatted = new Date().toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});

		let md = `# 📝 TEST DAY REVISION SHEET & MISTAKE BIBLE\n`;
		md += `**Candidate:** ${candidateName} | **${targetDate}** | **Generated:** ${dateFormatted}\n\n`;

		md += `## 🎯 4 TEST DAY GOLDEN RULES\n`;
		md += `1. **The 2-Minute Rule:** If no clear equation or solution emerges after 90 seconds, flag and move on.\n`;
		md += `2. **Trap Detection:** Circle keywords: 'NOT correct', 'except', 'magnitude vs direction', 'units (cm vs m, eV vs J)'.\n`;
		md += `3. **Clean Rough Work:** Keep rough paper divided into numbered boxes. Never lose marks to misread handwriting.\n`;
		md += `4. **Reset Protocol:** If 3 tough questions hit consecutively, take a 10s deep breath. Tough papers mean lower cutoffs.\n\n`;

		if ($testDaySheetOptions.includeMistakes && filteredMistakes.length > 0) {
			md += `## ⚠️ PERSONAL MISTAKE LOG & EXAM TRAPS (${filteredMistakes.length})\n`;
			for (const m of filteredMistakes) {
				md += `- **[${m.subject}] [${m.errorType}]** ${m.description} *(Context: ${m.testName || 'Mock Test'})*\n`;
			}
			md += `\n`;
		}

		if ($testDaySheetOptions.includeFormulas && filteredFormulas.length > 0) {
			md += `## 📐 STARRED & HIGH-YIELD FORMULAS (${filteredFormulas.length})\n`;
			for (const group of groupedFormulas) {
				const subName = group.subject === 'P' ? 'Physics' : group.subject === 'C' ? 'Chemistry' : 'Mathematics';
				md += `### ${subName} — ${group.chapterName}\n`;
				for (const f of group.formulas) {
					md += `- **${f.title}**: \`$${f.latex}$\`\n`;
					if (f.description) md += `  *Note: ${f.description}*\n`;
				}
				md += `\n`;
			}
		}

		if ($testDaySheetOptions.includeStrategy) {
			md += `## ⏱️ TIME MANAGEMENT BLUEPRINT\n`;
			md += `- **Chemistry (35–45m):** Factual memory & quick equations. Bank safe score first.\n`;
			md += `- **Physics (55–65m):** High-accuracy numericals and standard derivations.\n`;
			md += `- **Maths (70–80m):** Multi-step calculus, coordinate geometry & algebra. Stay calm.\n`;
			md += `- **Review Buffer (10–15m):** Re-verify marked doubts, bubble checks, boundary values.\n\n`;
		}

		if ($testDaySheetOptions.includeNotes && $testDaySheetOptions.examNotes.trim()) {
			md += `## ✍️ PERSONAL EXAM MORNING NOTES\n`;
			md += `${$testDaySheetOptions.examNotes.trim()}\n\n`;
		}

		try {
			await navigator.clipboard.writeText(md);
			copiedMarkdown = true;
			uiSuccess();
			celebration.set('Copied complete Test Day Sheet to clipboard in Markdown! 📋');
			clearTimeout(copyTimeout);
			copyTimeout = setTimeout(() => {
				copiedMarkdown = false;
			}, 2500);
		} catch (err) {
			console.warn('Clipboard write failed:', err);
		}
	}

	function handleClose() {
		open = false;
		closeTestDaySheet();
	}
</script>

<svelte:window on:keydown={(e) => { if (open && e.key === 'Escape') handleClose(); }} />

{#if open}
	<!-- Backdrop (hidden during print) -->
	<div
		class="sheet-modal-backdrop no-print"
		transition:fade={{ duration: 180 }}
		on:click={handleClose}
		on:keydown={(e) => e.key === 'Escape' && handleClose()}
		role="button"
		tabindex="-1"
		aria-label="Close Sheet Generator"
	></div>

	<!-- Modal Container -->
	<div class="sheet-modal-wrapper" transition:fly={{ y: 24, duration: 240 }} role="dialog" aria-modal="true">
		<!-- Top Controls Toolbar (Hidden during physical print) -->
		<header class="sheet-modal-toolbar no-print">
			<div class="toolbar-left">
				<div class="toolbar-title-box">
					<div class="printer-badge"><NavIcon name="printer" size={17} /></div>
					<div>
						<h3>Test Day Paper Sheet Generator</h3>
						<p class="toolbar-sub">Personal Mistake Bible &amp; Starred Formula Sheet for Exam Day</p>
					</div>
				</div>

				<!-- Subject Pills -->
				<div class="subject-toggle-row">
					<button
						type="button"
						class="pill-btn"
						class:active={$testDaySheetOptions.subject === 'ALL'}
						on:click={() => { $testDaySheetOptions.subject = 'ALL'; uiClick(); }}
					>
						All PCM
					</button>
					<button
						type="button"
						class="pill-btn phy"
						class:active={$testDaySheetOptions.subject === 'Physics'}
						on:click={() => { $testDaySheetOptions.subject = 'Physics'; uiClick(); }}
					>
						Physics
					</button>
					<button
						type="button"
						class="pill-btn chem"
						class:active={$testDaySheetOptions.subject === 'Chemistry'}
						on:click={() => { $testDaySheetOptions.subject = 'Chemistry'; uiClick(); }}
					>
						Chemistry
					</button>
					<button
						type="button"
						class="pill-btn math"
						class:active={$testDaySheetOptions.subject === 'Maths'}
						on:click={() => { $testDaySheetOptions.subject = 'Maths'; uiClick(); }}
					>
						Maths
					</button>
				</div>
			</div>

			<!-- Toolbar Actions -->
			<div class="toolbar-right">
				<button type="button" class="btn-tool" on:click={copyAsMarkdown} title="Copy as Markdown">
					<NavIcon name="copy" size={14} />
					<span>{copiedMarkdown ? 'Copied ✓' : 'Copy MD'}</span>
				</button>

				<button type="button" class="btn-tool print-btn" on:click={triggerPrint} title="Print or Save as PDF">
					<NavIcon name="printer" size={15} />
					<span>Print Paper Sheet / PDF</span>
				</button>

				<button type="button" class="btn-close" on:click={handleClose} aria-label="Close Modal">
					<NavIcon name="x" size={18} />
				</button>
			</div>
		</header>

		<!-- Secondary Customization Bar (Filter Toggles, Column Layout, Density) (Hidden during print) -->
		<div class="sheet-config-bar no-print">
			<!-- Section Inclusion Checkboxes -->
			<div class="config-group">
				<span class="config-label font-mono">SECTIONS:</span>
				<label class="config-toggle">
					<input type="checkbox" bind:checked={$testDaySheetOptions.includeMistakes} />
					<span>Mistakes ({totalMistakesCount})</span>
				</label>
				<label class="config-toggle" title="Filter out already resolved/mastered mistakes">
					<input type="checkbox" bind:checked={excludeResolved} />
					<span>Unmastered Only</span>
				</label>
				<label class="config-toggle">
					<input type="checkbox" bind:checked={$testDaySheetOptions.includeFormulas} />
					<span>Formulas ({totalFormulasCount})</span>
				</label>
				<label class="config-toggle">
					<input type="checkbox" bind:checked={$testDaySheetOptions.includeStrategy} />
					<span>Strategy</span>
				</label>
				<label class="config-toggle">
					<input type="checkbox" bind:checked={$testDaySheetOptions.includeNotes} />
					<span>Morning Notes</span>
				</label>
			</div>

			<!-- Formula Source Filter -->
			<div class="config-group">
				<span class="config-label font-mono">FORMULAS:</span>
				<select class="config-select" bind:value={$testDaySheetOptions.formulaSource} on:change={uiClick}>
					<option value="both">Starred ({starredFormulasCount}) + High-Yield</option>
					<option value="starred">Starred Only ({starredFormulasCount})</option>
					<option value="highyield">Curated High-Yield Only</option>
				</select>
			</div>

			<!-- Column & Font Density -->
			<div class="config-group">
				<span class="config-label font-mono">LAYOUT:</span>
				<div class="btn-group-segmented">
					<button
						type="button"
						class:active={$testDaySheetOptions.columnLayout === '1-col'}
						on:click={() => { $testDaySheetOptions.columnLayout = '1-col'; uiClick(); }}
						title="Single Column"
					>
						1-Col
					</button>
					<button
						type="button"
						class:active={$testDaySheetOptions.columnLayout === '2-col'}
						on:click={() => { $testDaySheetOptions.columnLayout = '2-col'; uiClick(); }}
						title="2-Column Standard A4"
					>
						2-Col
					</button>
					<button
						type="button"
						class:active={$testDaySheetOptions.columnLayout === '3-col'}
						on:click={() => { $testDaySheetOptions.columnLayout = '3-col'; uiClick(); }}
						title="3-Column Pocket Cram"
					>
						3-Col
					</button>
				</div>
			</div>
			<!-- Font Density -->
			<div class="config-group">
				<span class="config-label font-mono">FONT:</span>
				<div class="btn-group-segmented">
					<button
						type="button"
						class:active={$testDaySheetOptions.fontSize === 'xs'}
						on:click={() => { $testDaySheetOptions.fontSize = 'xs'; uiClick(); }}
						title="Compact type — fits more per page"
					>
						Compact
					</button>
					<button
						type="button"
						class:active={$testDaySheetOptions.fontSize === 'sm'}
						on:click={() => { $testDaySheetOptions.fontSize = 'sm'; uiClick(); }}
						title="Normal type"
					>
						Normal
					</button>
					<button
						type="button"
						class:active={$testDaySheetOptions.fontSize === 'base'}
						on:click={() => { $testDaySheetOptions.fontSize = 'base'; uiClick(); }}
						title="Large type — easier to read at a glance"
					>
						Large
					</button>
				</div>
			</div>
		</div>

		<!-- Scrollable Preview Body (What gets printed onto physical paper!) -->
		<div class="sheet-preview-scroll">
			<article
				id="test-day-paper-sheet"
				class="test-day-paper-sheet layout-{$testDaySheetOptions.columnLayout} font-{$testDaySheetOptions.fontSize}"
			>
				<!-- Printable Paper Header -->
				<header class="paper-header">
					<div class="paper-header-brand">
						<div class="paper-badge-pill">TEST DAY STRATEGY &amp; CRAM SHEET</div>
						<h1 class="paper-title">PERSONAL MISTAKE BIBLE &amp; FORMULA VAULT</h1>
						<div class="paper-meta-row">
							<span><b>Candidate:</b> {$tracker.meta?.name || 'JEE Aspirant'}</span>
							<span>•</span>
							<span><b>Target:</b> {$tracker.meta?.exam ? `${$tracker.meta.exam}` : 'Final Exam'}</span>
							<span>•</span>
							<span><b>Mode:</b> {$testDaySheetOptions.subject === 'ALL' ? 'Complete PCM' : $testDaySheetOptions.subject}</span>
							<span>•</span>
							<span><b>Date:</b> {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
						</div>
					</div>
					<div class="paper-header-right">
						<div class="watermark-tag">BTRACKER • EXAM PREP</div>
					</div>
				</header>

				<!-- Paper Section: 4 Golden Rules & Mindset -->
				{#if $testDaySheetOptions.includeStrategy}
					<section class="paper-section mindset-section">
						<h2 class="section-title">
							<span class="num">01</span>
							<span>TEST DAY GOLDEN RULES &amp; TIME MANAGEMENT</span>
						</h2>

						<div class="rules-grid">
							<div class="rule-box">
								<b class="rule-title">⏱️ 1. The 2-Minute Rule</b>
								<p>If no clear solution path or equation emerges within 90 seconds, flag and move on. Never let 1 tricky question rob you of 3 easy numericals.</p>
							</div>
							<div class="rule-box">
								<b class="rule-title">🔍 2. Trap Word Check</b>
								<p>Circle keywords immediately: <em>NOT correct</em>, <em>except</em>, <em>magnitude vs vector</em>, <em>gauge vs absolute pressure</em>, and unit traps (cm vs m, eV vs J).</p>
							</div>
							<div class="rule-box">
								<b class="rule-title">📝 3. Compartmentalized Rough Work</b>
								<p>Divide rough sheet into numbered boxes. Sloppy handwriting and scattered arithmetic are responsible for 70% of silly mistakes.</p>
							</div>
							<div class="rule-box">
								<b class="rule-title">🧘 4. 10-Second Mental Reset</b>
								<p>Hit 3 tough problems in a row? Put the pen down, take a deep breath, and reset. Hard papers have dramatically lower cutoffs; maintain poise.</p>
							</div>
						</div>

						<!-- Time Split Rail -->
						<div class="time-split-strip">
							<div class="time-col chem">
								<span class="subj">CHEMISTRY</span>
								<span class="dur">35–45 min</span>
								<small>Speed &amp; direct factual recall. Bank safe marks first.</small>
							</div>
							<div class="time-col phy">
								<span class="subj">PHYSICS</span>
								<span class="dur">55–65 min</span>
								<small>Conceptual application, standard setups &amp; derivations.</small>
							</div>
							<div class="time-col math">
								<span class="subj">MATHEMATICS</span>
								<span class="dur">70–80 min</span>
								<small>Multi-step calculus &amp; coordinate algebra. Keep composure.</small>
							</div>
							<div class="time-col review">
								<span class="subj">BUFFER / AUDIT</span>
								<span class="dur">10–15 min</span>
								<small>Review flagged items, check bubbles, verify signs.</small>
							</div>
						</div>
					</section>
				{/if}

				<!-- Paper Section: Personal Mistakes & Exam Traps -->
				{#if $testDaySheetOptions.includeMistakes}
					<section class="paper-section mistakes-section">
						<div class="section-header-flex">
							<h2 class="section-title">
								<span class="num">02</span>
								<span>PERSONAL MISTAKE LOG &amp; TRAPS TO AVOID ({filteredMistakes.length})</span>
							</h2>
							{#if isUsingCuratedMistakes}
								<span class="curated-badge no-print">Showing High-Frequency Exam Traps (Log tests in Mistake Book to personalize!)</span>
							{/if}
						</div>

						{#if filteredMistakes.length === 0}
							<div class="empty-state-notice">
								<p>No mistakes match your current filters. Select additional error types or subjects.</p>
							</div>
						{:else}
							<div class="mistakes-columns">
								{#each filteredMistakes as m (m.id)}
									<div class="mistake-item-card error-{m.errorType.toLowerCase()}">
										<div class="mistake-item-header">
											<div class="mistake-badges">
												<span class="sub-badge sub-{m.subject.toLowerCase()}">{m.subject}</span>
												<span class="error-badge error-{m.errorType.toLowerCase()}">{m.errorType} Error</span>
											</div>
											{#if m.testName}
												<span class="test-origin">{m.testName}</span>
											{/if}
										</div>
										<p class="mistake-desc">{m.description}</p>
										<div class="mistake-warning-tag">
											<b>⚠️ Trap to Avoid:</b>
											<span>
												{#if m.errorType === 'Silly'}
													Double check arithmetic, units, and coordinate signs before bubbling.
												{:else if m.errorType === 'Formula'}
													Review dimensional consistency and boundary conditions (e.g. constant acceleration, small angles).
												{:else if m.errorType === 'Conceptual'}
													Verify first principles and definitions. Don't apply shortcuts blindly.
												{:else}
													If calculation exceeds 2.5 minutes, leave it for the 2nd pass!
												{/if}
											</span>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				<!-- Paper Section: Starred & High-Yield Formulas -->
				{#if $testDaySheetOptions.includeFormulas}
					<section class="paper-section formulas-section">
						<div class="section-header-flex">
							<h2 class="section-title">
								<span class="num">03</span>
								<span>STARRED &amp; HIGH-YIELD FORMULAS ({filteredFormulas.length})</span>
							</h2>
							<span class="formula-count-badge">
								{#if $testDaySheetOptions.formulaSource === 'starred'}
									{starredFormulasCount} Starred Formulas
								{:else if $testDaySheetOptions.formulaSource === 'highyield'}
									Core High-Yield Equations
								{:else}
									{starredFormulasCount} Starred + High-Yield Curated
								{/if}
							</span>
						</div>

						{#if filteredFormulas.length === 0}
							<div class="empty-state-notice">
								<p>No formulas found. Switch formula filter to "High-Yield Curated" or star formulas in the Formula Vault!</p>
							</div>
						{:else}
							<div class="formulas-columns">
								{#each groupedFormulas as group}
									<div class="chapter-formula-card">
										<div class="chapter-card-header">
											<span class="sub-dot sub-{group.subject.toLowerCase()}"></span>
											<b>{group.chapterName}</b>
											<span class="chapter-sub-name">{group.subject === 'P' ? 'Physics' : group.subject === 'C' ? 'Chemistry' : 'Maths'}</span>
										</div>

										<div class="formula-items-list">
											{#each group.formulas as f (f.id)}
												<div class="single-formula-row">
													<div class="formula-row-head">
														<span class="f-title">{f.title}</span>
														<div class="f-actions no-print">
															<button
																type="button"
																class="star-btn-inline"
																class:starred={starredIds.includes(f.id)}
																on:click={() => toggleStar(f.id)}
																title={starredIds.includes(f.id) ? 'Starred in Vault' : 'Star this formula'}
															>
																<NavIcon name="bookmark" size={12} />
															</button>
														</div>
													</div>

													<div class="formula-math-display">
														{@html renderMath(f.latex, renderTick)}
													</div>

													{#if f.description}
														<p class="formula-caveat">{f.description}</p>
													{/if}
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{/if}

				<!-- Paper Section: Personal Exam Morning Scratch Notes -->
				{#if $testDaySheetOptions.includeNotes}
					<section class="paper-section notes-section">
						<h2 class="section-title">
							<span class="num">04</span>
							<span>PERSONAL EXAM MORNING NOTES &amp; MANTRAS</span>
						</h2>

						<div class="exam-notes-container">
							<!-- Interactive Textarea on Screen -->
							<textarea
								class="exam-notes-editor no-print"
								placeholder="Jot down any final exam-morning reminders here before printing (auto-saves locally)&#10;• Example: Don't spend >3m on Calculus question 1&#10;• Example: Lens formula 1/v - 1/u = 1/f (minus sign!)&#10;• Example: Drink water at the 90-minute mark..."
								value={$testDaySheetOptions.examNotes}
								on:input={(e) => saveExamNotes(e.currentTarget.value)}
								rows="4"
							></textarea>

							<!-- Static High-Contrast Printable View for Paper -->
							<div class="exam-notes-print-view">
								{#if $testDaySheetOptions.examNotes.trim()}
									<pre class="notes-pre">{$testDaySheetOptions.examNotes.trim()}</pre>
								{:else}
									<div class="blank-lines-for-writing">
										<div class="handwriting-line"></div>
										<div class="handwriting-line"></div>
										<div class="handwriting-line"></div>
									</div>
								{/if}
							</div>
						</div>
					</section>
				{/if}

				<!-- Paper Footer -->
				<footer class="paper-footer">
					<div class="footer-left">
						<span>Generated with BTracker • Offline-First JEE Strategy Platform</span>
					</div>
					<div class="footer-right">
						<span>"Mistakes are your teachers for the final day." — BM Sir</span>
					</div>
				</footer>
			</article>
		</div>
	</div>
{/if}

<style>
	/* Modal Overlay (Screen Only) */
	.sheet-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.72);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		z-index: 10000;
	}

	.sheet-modal-wrapper {
		position: fixed;
		inset: 1.5rem;
		top: 1.2rem;
		bottom: 1.2rem;
		z-index: 10001;
		display: flex;
		flex-direction: column;
		background: var(--surface-popup-solid, #0e1117);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
		border-radius: 20px;
		box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.7);
		overflow: hidden;
	}

	/* Top Toolbar */
	.sheet-modal-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 1.4rem;
		background: color-mix(in srgb, var(--surface-popup-solid, #131127) 96%, transparent);
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	.toolbar-left {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.toolbar-title-box {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.printer-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.toolbar-title-box h3 {
		font-size: 1.05rem;
		font-weight: 800;
		margin: 0;
		color: var(--text-primary);
		letter-spacing: -0.015em;
	}

	.toolbar-sub {
		font-size: 0.72rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.subject-toggle-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: var(--surface-subtle);
		padding: 0.2rem;
		border-radius: 99px;
		border: 1px solid var(--border-subtle);
	}

	.pill-btn {
		background: transparent;
		border: none;
		padding: 0.25rem 0.7rem;
		border-radius: 99px;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.pill-btn:hover {
		color: var(--text-primary);
	}

	.pill-btn.active {
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
		box-shadow: 0 2px 8px -2px var(--accent);
	}

	.pill-btn.phy.active { background: #3b82f6; }
	.pill-btn.chem.active { background: #10b981; }
	.pill-btn.math.active { background: #f59e0b; color: #1c1002; }

	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.btn-tool {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.85rem;
		border-radius: 10px;
		background: var(--surface-subtle);
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-tool:hover {
		background: color-mix(in srgb, var(--surface-panel) 95%, transparent);
		border-color: var(--accent);
	}

	.btn-tool.print-btn {
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
		border-color: var(--accent);
		box-shadow: 0 4px 14px -3px var(--accent);
	}

	.btn-tool.print-btn:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.btn-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: transparent;
		border: 1px solid transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-close:hover {
		background: var(--surface-subtle);
		color: var(--text-primary);
		border-color: var(--border-subtle);
	}

	/* Config Bar */
	.sheet-config-bar {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 0.55rem 1.4rem;
		background: color-mix(in srgb, var(--surface-popup-solid, #131127) 90%, transparent);
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
		flex-wrap: wrap;
		font-size: 0.74rem;
	}

	.config-group {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.config-label {
		font-size: 0.62rem;
		font-weight: 800;
		color: var(--text-secondary);
		letter-spacing: 0.05em;
	}

	.config-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		color: var(--text-primary);
		font-weight: 600;
		user-select: none;
	}

	.config-toggle input {
		accent-color: var(--accent);
	}

	.config-select {
		background: var(--surface-panel);
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 0.25rem 0.55rem;
		font-size: 0.72rem;
		font-weight: 600;
		outline: none;
		cursor: pointer;
	}

	.btn-group-segmented {
		display: inline-flex;
		background: var(--surface-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		overflow: hidden;
	}

	.btn-group-segmented button {
		background: transparent;
		border: none;
		padding: 0.22rem 0.55rem;
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--text-secondary);
		cursor: pointer;
		border-right: 1px solid var(--border-subtle);
	}

	.btn-group-segmented button:last-child {
		border-right: none;
	}

	.btn-group-segmented button.active {
		background: var(--accent);
		color: var(--accent-contrast, #ffffff);
	}

	/* Scrollable Preview Area */
	.sheet-preview-scroll {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 1.5rem;
		display: flex;
		justify-content: center;
		background: rgba(0, 0, 0, 0.35);
	}

	/* ========================================================
	   THE PHYSICAL PAPER SHEET
	   This is what gets printed on A4 / Letter paper!
	   ======================================================== */
	.test-day-paper-sheet {
		width: 100%;
		max-width: 960px;
		background: #ffffff;
		color: #111827;
		padding: 2.2rem 2.4rem;
		border-radius: 12px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	}

	/* Font density presets (screen zoom keeps every section proportional) */
	.test-day-paper-sheet.font-xs { zoom: 0.9; max-width: min(960px, 100%); }
	.test-day-paper-sheet.font-sm { zoom: 1; }
	.test-day-paper-sheet.font-base { zoom: 1.08; max-width: min(960px, 92%); }

	/* Header */
	.paper-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.1rem;
		border-bottom: 2.5px solid #111827;
		margin-bottom: 1.3rem;
	}

	.paper-badge-pill {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #4b5563;
		margin-bottom: 0.25rem;
	}

	.paper-title {
		font-size: 1.35rem;
		font-weight: 900;
		color: #111827;
		letter-spacing: -0.02em;
		margin: 0 0 0.4rem 0;
		line-height: 1.15;
	}

	.paper-meta-row {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.74rem;
		color: #4b5563;
		flex-wrap: wrap;
	}

	.paper-meta-row b {
		color: #111827;
	}

	.watermark-tag {
		font-size: 0.64rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		color: #9ca3af;
		padding: 0.25rem 0.6rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		white-space: nowrap;
	}

	/* Section Commons */
	.paper-section {
		margin-bottom: 1.4rem;
		page-break-inside: auto;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.95rem;
		font-weight: 850;
		color: #111827;
		margin: 0 0 0.85rem 0;
		padding-bottom: 0.35rem;
		border-bottom: 1.5px solid #e5e7eb;
		letter-spacing: -0.01em;
	}

	.section-title .num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 6px;
		background: #111827;
		color: #ffffff;
		font-size: 0.65rem;
		font-weight: 900;
	}

	.section-header-flex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
		border-bottom: 1.5px solid #e5e7eb;
		padding-bottom: 0.35rem;
	}

	.section-header-flex .section-title {
		margin: 0;
		border-bottom: none;
		padding-bottom: 0;
	}

	.curated-badge {
		font-size: 0.65rem;
		font-weight: 700;
		color: #d97706;
		background: #fef3c7;
		padding: 0.15rem 0.5rem;
		border-radius: 6px;
	}

	.formula-count-badge {
		font-size: 0.68rem;
		font-weight: 750;
		color: #4b5563;
		background: #f3f4f6;
		padding: 0.15rem 0.55rem;
		border-radius: 6px;
	}

	/* Rules Grid */
	.rules-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.65rem;
		margin-bottom: 0.85rem;
	}

	.rule-box {
		padding: 0.65rem 0.8rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		font-size: 0.73rem;
		line-height: 1.35;
		color: #374151;
		page-break-inside: avoid;
		break-inside: avoid;
	}

	.rule-title {
		display: block;
		font-size: 0.76rem;
		font-weight: 800;
		color: #111827;
		margin-bottom: 0.2rem;
	}

	.rule-box p {
		margin: 0;
	}

	/* Time Split Strip */
	.time-split-strip {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 0.6rem 0.75rem;
		page-break-inside: avoid;
		break-inside: avoid;
	}

	.time-col {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.time-col .subj {
		font-size: 0.62rem;
		font-weight: 850;
		letter-spacing: 0.04em;
	}

	.time-col.chem .subj { color: #047857; }
	.time-col.phy .subj { color: #1d4ed8; }
	.time-col.math .subj { color: #b45309; }
	.time-col.review .subj { color: #4b5563; }

	.time-col .dur {
		font-size: 0.84rem;
		font-weight: 900;
		color: #111827;
	}

	.time-col small {
		font-size: 0.63rem;
		color: #6b7280;
		line-height: 1.25;
	}

	/* Mistakes Layout */
	.mistakes-columns {
		display: grid;
		gap: 0.65rem;
	}

	.layout-1-col .mistakes-columns { grid-template-columns: 1fr; }
	.layout-2-col .mistakes-columns { grid-template-columns: repeat(2, 1fr); }
	.layout-3-col .mistakes-columns { grid-template-columns: repeat(3, 1fr); }

	.mistake-item-card {
		padding: 0.65rem 0.85rem;
		border-radius: 8px;
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-left: 3.5px solid #111827;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		page-break-inside: avoid;
		break-inside: avoid;
	}

	.mistake-item-card.error-silly { border-left-color: #ef4444; background: #fffdfd; }
	.mistake-item-card.error-formula { border-left-color: #f59e0b; background: #fffcf8; }
	.mistake-item-card.error-conceptual { border-left-color: #8b5cf6; background: #fdfcff; }
	.mistake-item-card.error-time { border-left-color: #3b82f6; background: #f8fbff; }

	.mistake-item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
	}

	.mistake-badges {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.sub-badge {
		font-size: 0.58rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.08rem 0.35rem;
		border-radius: 4px;
	}

	.sub-physics, .sub-p { background: #dbeafe; color: #1e40af; }
	.sub-chemistry, .sub-c { background: #d1fae5; color: #065f46; }
	.sub-maths, .sub-m { background: #fef3c7; color: #92400e; }

	.error-badge {
		font-size: 0.58rem;
		font-weight: 800;
		padding: 0.08rem 0.35rem;
		border-radius: 4px;
	}

	.error-badge.error-silly { background: #fee2e2; color: #991b1b; }
	.error-badge.error-formula { background: #fef3c7; color: #92400e; }
	.error-badge.error-conceptual { background: #ede9fe; color: #5b21b6; }
	.error-badge.error-time { background: #e0e7ff; color: #3730a3; }

	.test-origin {
		font-size: 0.62rem;
		font-weight: 700;
		color: #6b7280;
	}

	.mistake-desc {
		font-size: 0.74rem;
		color: #111827;
		font-weight: 600;
		line-height: 1.35;
		margin: 0;
	}

	.mistake-warning-tag {
		font-size: 0.67rem;
		color: #4b5563;
		line-height: 1.3;
		padding-top: 0.25rem;
		border-top: 1px dashed #e5e7eb;
	}

	.mistake-warning-tag b {
		color: #111827;
	}

	/* Formulas Layout */
	.formulas-columns {
		display: grid;
		gap: 0.75rem;
	}

	.layout-1-col .formulas-columns { grid-template-columns: 1fr; }
	.layout-2-col .formulas-columns { grid-template-columns: repeat(2, 1fr); }
	.layout-3-col .formulas-columns { grid-template-columns: repeat(3, 1fr); }

	.chapter-formula-card {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #ffffff;
		overflow: hidden;
		page-break-inside: avoid;
		break-inside: avoid;
	}

	.chapter-card-header {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.75rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		font-size: 0.75rem;
		color: #111827;
	}

	.sub-dot {
		width: 7px;
		height: 7px;
		border-radius: 99px;
	}

	.sub-dot.sub-p { background: #3b82f6; }
	.sub-dot.sub-c { background: #10b981; }
	.sub-dot.sub-m { background: #f59e0b; }

	.chapter-sub-name {
		font-size: 0.62rem;
		color: #6b7280;
		margin-left: auto;
		text-transform: uppercase;
		font-weight: 700;
	}

	.formula-items-list {
		padding: 0.45rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.single-formula-row {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #f3f4f6;
		page-break-inside: avoid;
		break-inside: avoid;
	}

	.single-formula-row:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.formula-row-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.4rem;
	}

	.f-title {
		font-size: 0.72rem;
		font-weight: 750;
		color: #1f2937;
	}

	.star-btn-inline {
		background: transparent;
		border: none;
		color: #9ca3af;
		cursor: pointer;
		padding: 2px;
	}

	.star-btn-inline.starred {
		color: #f59e0b;
	}

	.formula-math-display {
		font-size: 0.86rem;
		color: #111827;
		padding: 0.25rem 0.4rem;
		background: #f9fafb;
		border-radius: 6px;
		border: 1px solid #f3f4f6;
		overflow-x: auto;
	}

	.formula-caveat {
		font-size: 0.65rem;
		color: #6b7280;
		margin: 0;
		line-height: 1.25;
		font-style: italic;
	}

	/* Notes Section */
	.exam-notes-container {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 0.75rem;
		page-break-inside: avoid;
		break-inside: avoid;
	}

	.exam-notes-editor {
		width: 100%;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 0.6rem;
		font-family: inherit;
		font-size: 0.75rem;
		color: #111827;
		background: #ffffff;
		resize: vertical;
		outline: none;
		box-sizing: border-box;
	}

	.exam-notes-editor:focus {
		border-color: #3b82f6;
	}

	.exam-notes-print-view {
		display: none;
	}

	.notes-pre {
		margin: 0;
		white-space: pre-wrap;
		font-family: inherit;
		font-size: 0.74rem;
		line-height: 1.4;
		color: #111827;
	}

	.blank-lines-for-writing {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.35rem 0;
	}

	.handwriting-line {
		height: 1px;
		background: #d1d5db;
		width: 100%;
	}

	.empty-state-notice {
		padding: 1.2rem;
		text-align: center;
		color: #6b7280;
		font-size: 0.75rem;
		background: #f9fafb;
		border: 1px dashed #d1d5db;
		border-radius: 8px;
	}

	/* Paper Footer */
	.paper-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 1rem;
		border-top: 1.5px solid #e5e7eb;
		font-size: 0.65rem;
		color: #6b7280;
		margin-top: 1.5rem;
	}

	/* ========================================================
	   PRINT-SPECIFIC STYLESHEET
	   ======================================================== */
	@media print {
		/* Force print background graphics */
		:global(*) {
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		/* Hide all surrounding app interface */
		:global(body) {
			background: #ffffff !important;
			color: #111827 !important;
			margin: 0 !important;
			padding: 0 !important;
		}

		:global(.app-shell),
		:global(.mobile-bottom-nav),
		:global(.app-sidebar),
		:global(.global-overlays),
		:global(.pip-island),
		:global(.dynamic-island),
		:global(.ai-mentor),
		:global(.sheet-modal-backdrop),
		:global(.sheet-modal-toolbar),
		:global(.sheet-config-bar),
		.no-print {
			display: none !important;
		}

		.sheet-modal-wrapper {
			position: static !important;
			inset: auto !important;
			height: auto !important;
			max-height: none !important;
			border: 0 !important;
			border-radius: 0 !important;
			box-shadow: none !important;
			background: transparent !important;
			overflow: visible !important;
		}

		.sheet-preview-scroll {
			position: static !important;
			inset: auto !important;
			height: auto !important;
			max-height: none !important;
			padding: 0 !important;
			overflow: visible !important;
			background: transparent !important;
			box-shadow: none !important;
			border: 0 !important;
			display: block !important;
		}

		.test-day-paper-sheet {
			zoom: 1 !important;
			max-width: 100% !important;
			width: 100% !important;
			padding: 0 !important;
			border: none !important;
			border-radius: 0 !important;
			box-shadow: none !important;
			color: #111827 !important;
		}

		.exam-notes-editor {
			display: none !important;
		}

		.exam-notes-print-view {
			display: block !important;
		}

		/* Prevent page cut through critical elements */
		.rule-box,
		.mistake-item-card,
		.chapter-formula-card,
		.single-formula-row,
		.time-split-strip,
		.exam-notes-container {
			page-break-inside: avoid !important;
			break-inside: avoid !important;
		}

		@page {
			size: A4 portrait;
			margin: 10mm 10mm 10mm 10mm;
		}
	}

	@media (max-width: 768px) {
		.sheet-modal-wrapper {
			inset: 0.4rem;
			border-radius: 12px;
		}
		.sheet-modal-toolbar {
			padding: 0.75rem 0.9rem;
		}
		.sheet-config-bar {
			padding: 0.5rem 0.9rem;
		}
		.sheet-preview-scroll {
			padding: 0.8rem;
		}
		.test-day-paper-sheet {
			padding: 1.2rem 1.1rem;
		}
		.rules-grid,
		.time-split-strip {
			grid-template-columns: 1fr;
		}
		.layout-2-col .mistakes-columns,
		.layout-3-col .mistakes-columns,
		.layout-2-col .formulas-columns,
		.layout-3-col .formulas-columns {
			grid-template-columns: 1fr;
		}
	}

	:global(:root[data-theme='light']) .sheet-modal-wrapper,
	:global(:root[data-theme='notion']) .sheet-modal-wrapper,
	:global(:root[data-theme='duolingo']) .sheet-modal-wrapper,
	:global(:root[data-theme='anki']) .sheet-modal-wrapper,
	:global(:root[data-theme='master']) .sheet-modal-wrapper {
		background: #f4f4f7 !important;
		border-color: rgba(0, 0, 0, 0.1) !important;
		box-shadow: 0 24px 60px -12px rgba(20, 16, 40, 0.2) !important;
	}

	:global(:root[data-theme='light']) .sheet-modal-toolbar,
	:global(:root[data-theme='notion']) .sheet-modal-toolbar,
	:global(:root[data-theme='duolingo']) .sheet-modal-toolbar,
	:global(:root[data-theme='anki']) .sheet-modal-toolbar,
	:global(:root[data-theme='master']) .sheet-modal-toolbar {
		background: #ffffff !important;
		border-color: rgba(0, 0, 0, 0.08) !important;
	}

	:global(:root[data-theme='light']) .sheet-config-bar,
	:global(:root[data-theme='notion']) .sheet-config-bar,
	:global(:root[data-theme='duolingo']) .sheet-config-bar,
	:global(:root[data-theme='anki']) .sheet-config-bar,
	:global(:root[data-theme='master']) .sheet-config-bar {
		background: #f8f8fb !important;
		border-color: rgba(0, 0, 0, 0.08) !important;
	}
</style>
