<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fade, slide, scale } from 'svelte/transition';
	import { tracker, updateTracker, celebration } from '$lib/stores/tracker';
	import { currentUser } from '$lib/stores/auth';
	import { supabaseConfigured } from '$lib/services/supabase';
	import {
		SECTION_CONFIG,
		uploadFilesToSection,
		deleteFileFromSection,
		extractFileFromSection,
		downloadSectionZipArchive,
		syncFromCloudStorage,
		formatBytes
	} from '$lib/services/studyDump';
	import type { DumpSection, DumpFileMeta } from '$lib/types/tracker';
	import Modal from '$lib/components/ui/Modal.svelte';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import { extractTextFromPdfBlob } from '$lib/services/pdfText';
	import { sendToAiMentor, triggerOrbFlight } from '$lib/stores/aiMentor';

	// Active tab
	let activeTab: 'all' | DumpSection = 'all';
	let searchQuery = '';

	// Upload Modal State
	let uploadModalOpen = false;
	let selectedUploadSection: DumpSection = 'P';
	let selectedFiles: File[] = [];
	let uploadNotes = '';
	let uploadTag = '';
	let isUploading = false;
	let uploadProgressText = '';
	let fileInputRef: HTMLInputElement | null = null;
	let isDraggingOver = false;

	// In-Browser Ephemeral Preview Modal State
	let previewOpen = false;
	let previewFile: DumpFileMeta | null = null;
	let previewUrl: string | null = null;
	let previewBlob: Blob | null = null;
	let previewLoading = false;
	let previewTextContent: string | null = null;
	let isReaderFullscreen = false;
	let isAiExtracting = false;

	// Setup Modal
	let setupModalOpen = false;

	// Cloud Sync state
	let isSyncing = false;
	let bannerNotice: { type: 'success' | 'warning' | 'error'; text: string } | null = null;

	$: userId = $currentUser?.id || 'default_vault';
	$: isCloudActive = supabaseConfigured;

	// Retrieve file list from tracker store
	$: allFiles = $tracker.studyDump?.files || [];
	$: zipSizes = $tracker.studyDump?.sectionZipSizes || {};

	// Total calculations
	$: totalFileCount = allFiles.length;
	$: totalStoredBytes = Object.values(zipSizes).reduce((sum, sz) => sum + (sz || 0), 0);

	// Filtered files
	$: filteredFiles = allFiles
		.filter((f) => {
			if (activeTab !== 'all' && f.section !== activeTab) return false;
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			return (
				f.name.toLowerCase().includes(q) ||
				(f.notes && f.notes.toLowerCase().includes(q)) ||
				(f.tags && f.tags.some((t) => t.toLowerCase().includes(q)))
			);
		})
		.sort((a, b) => b.uploadedAt - a.uploadedAt);

	// Count per section
	$: pCount = allFiles.filter((f) => f.section === 'P').length;
	$: cCount = allFiles.filter((f) => f.section === 'C').length;
	$: mCount = allFiles.filter((f) => f.section === 'M').length;
	$: othersCount = allFiles.filter((f) => f.section === 'others').length;

	function openUpload(section?: DumpSection, initialFiles?: File[]) {
		selectedUploadSection = section || (activeTab === 'all' ? 'P' : activeTab);
		if (initialFiles && initialFiles.length > 0) {
			selectedFiles = initialFiles;
		} else {
			selectedFiles = [];
		}
		uploadNotes = '';
		uploadTag = '';
		uploadProgressText = '';
		if (fileInputRef) fileInputRef.value = '';
		uploadModalOpen = true;
	}

	let isDropBoxDragging = false;

	function handleDropBoxDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDropBoxDragging = false;
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			selectedFiles = Array.from(e.dataTransfer.files);
		}
	}

	function handleDropBoxDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDropBoxDragging = true;
	}

	function handleDropBoxDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDropBoxDragging = false;
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFiles = Array.from(target.files);
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDraggingOver = false;
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			const files = Array.from(e.dataTransfer.files);
			openUpload(activeTab === 'all' ? 'P' : activeTab, files);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDraggingOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDraggingOver = false;
	}

	async function performUpload() {
		if (selectedFiles.length === 0) return;
		isUploading = true;
		uploadProgressText = `Compressing ${selectedFiles.length} file(s) into ${SECTION_CONFIG[selectedUploadSection].name} ZIP...`;

		try {
			const itemsToUpload = selectedFiles.map((file) => ({
				file,
				notes: uploadNotes.trim() || undefined,
				tags: uploadTag.trim() ? [uploadTag.trim()] : undefined
			}));

			const res = await uploadFilesToSection(
				userId,
				selectedUploadSection,
				itemsToUpload,
				allFiles
			);

			// Update tracker store
			updateTracker((t) => {
				if (!t.studyDump) t.studyDump = { files: [] };
				// Replace section files
				const otherSectionFiles = (t.studyDump.files || []).filter((f) => f.section !== selectedUploadSection);
				t.studyDump.files = [...otherSectionFiles, ...res.allSectionMetas];
				if (!t.studyDump.sectionZipSizes) t.studyDump.sectionZipSizes = {};
				t.studyDump.sectionZipSizes[selectedUploadSection] = res.zipSize;
				t.studyDump.lastSyncAt = Date.now();
			});

			uploadModalOpen = false;
			selectedFiles = [];
			uploadNotes = '';
			uploadTag = '';
			if (fileInputRef) fileInputRef.value = '';

			if (res.cloudSynced) {
				celebration.set(`Saved into ${SECTION_CONFIG[selectedUploadSection].name} ZIP in Cloud Storage!`);
				bannerNotice = {
					type: 'success',
					text: `Uploaded and synced ${res.addedMetas.length} file(s) to Cloud Storage (${formatBytes(res.zipSize)} ZIP).`
				};
			} else {
				bannerNotice = {
					type: 'warning',
					text: `Saved to local ZIP cache (${formatBytes(res.zipSize)}). ${
						res.cloudError ? `Cloud error: ${res.cloudError}` : 'Connect Cloud Storage in .env to sync across devices.'
					}`
				};
			}
		} catch (err: any) {
			console.error('Upload failed:', err);
			bannerNotice = { type: 'error', text: `Upload failed: ${err?.message || String(err)}` };
		} finally {
			isUploading = false;
			uploadProgressText = '';
		}
	}

	async function handleOpenPreview(file: DumpFileMeta) {
		previewFile = file;
		previewOpen = true;
		previewLoading = true;
		previewTextContent = null;
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}

		try {
			// Try with current userId first, then fallback to 'default_vault' key
			let extracted = await extractFileFromSection(userId, file.section, file.name);
			if (!extracted && userId !== 'default_vault') {
				extracted = await extractFileFromSection('default_vault', file.section, file.name);
			}
			if (!extracted) {
				bannerNotice = { type: 'error', text: `Could not extract "${file.name}" from ZIP archive.` };
				closePreview();
				return;
			}
			previewBlob = extracted.blob;
			previewUrl = URL.createObjectURL(extracted.blob);

			// If text file, read text
			if (
				file.mimeType.startsWith('text/') ||
				file.name.endsWith('.txt') ||
				file.name.endsWith('.md') ||
				file.name.endsWith('.json')
			) {
				previewTextContent = await extracted.blob.text();
			}
		} catch (e: any) {
			console.error('Failed to preview:', e);
			bannerNotice = { type: 'error', text: `Preview error: ${e?.message || String(e)}` };
			closePreview();
		} finally {
			previewLoading = false;
		}
	}

	function closePreview() {
		previewOpen = false;
		aiMenuOpen = false;
		isReaderFullscreen = false;
		const urlToRevoke = previewUrl;
		previewUrl = null;
		previewBlob = null;
		previewFile = null;
		previewTextContent = null;
		if (urlToRevoke) {
			setTimeout(() => URL.revokeObjectURL(urlToRevoke), 12000);
		}
	}

	async function handleDownloadSingle(file: DumpFileMeta) {
		try {
			const extracted = await extractFileFromSection(userId, file.section, file.name);
			if (!extracted) {
				bannerNotice = { type: 'error', text: `Failed to fetch file "${file.name}" from ZIP.` };
				return;
			}
			const url = URL.createObjectURL(extracted.blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = file.name;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			setTimeout(() => URL.revokeObjectURL(url), 4000);
		} catch (e: any) {
			bannerNotice = { type: 'error', text: `Download error: ${e?.message || String(e)}` };
		}
	}

	async function handleDeleteFile(file: DumpFileMeta) {
		if (!confirm(`Are you sure you want to remove "${file.name}" from the ${SECTION_CONFIG[file.section].name} ZIP?`)) {
			return;
		}

		try {
			const res = await deleteFileFromSection(userId, file.section, file.name, allFiles);
			updateTracker((t) => {
				if (!t.studyDump) t.studyDump = { files: [] };
				t.studyDump.files = res.remainingMetas;
				if (!t.studyDump.sectionZipSizes) t.studyDump.sectionZipSizes = {};
				t.studyDump.sectionZipSizes[file.section] = res.zipSize;
			});

			bannerNotice = {
				type: 'success',
				text: `Deleted "${file.name}". Updated ZIP archive (${formatBytes(res.zipSize)}).`
			};
		} catch (e: any) {
			bannerNotice = { type: 'error', text: `Delete error: ${e?.message || String(e)}` };
		}
	}

	async function handleDownloadSectionZip(sec: DumpSection) {
		try {
			await downloadSectionZipArchive(userId, sec);
			celebration.set(`Downloaded ${SECTION_CONFIG[sec].name} ZIP archive!`);
		} catch (e: any) {
			bannerNotice = { type: 'error', text: e?.message || 'Failed to download ZIP archive.' };
		}
	}

	let aiMenuOpen = false;
	let aiExtractingProgress = '';

	async function handleAiAction(action: 'flashcards' | 'quiz' | 'formulas' | 'chat', event?: MouseEvent) {
		if (!previewFile || isAiExtracting) return;

		// 1. Trigger the visual flying spark animation from the clicked element directly to the AI Orb!
		if (event && event.currentTarget) {
			const actionEmoji =
				action === 'formulas' ? '🔖' : action === 'flashcards' ? '⚡' : action === 'quiz' ? '🎯' : '💬';
			const actionLabel =
				action === 'formulas' ? 'Formulas' : action === 'flashcards' ? 'Flashcards' : action === 'quiz' ? 'Quiz' : 'Chat';
			triggerOrbFlight(event.currentTarget as HTMLElement, actionEmoji, actionLabel);
		}

		// 2. Close dropdown immediately with smooth fade
		aiMenuOpen = false;

		let prompt = '';
		let autoSend = true;
		let typingStatus = '';

		if (action === 'flashcards') {
			prompt = 'Generate 5 high-yield Active Recall flashcards based on the attached document. Include questions testing core definitions, formulas, and common traps. For each flashcard, format using the addFlashcards command.';
			typingStatus = `Extracting concepts & building flashcards from ${previewFile.name}...`;
		} else if (action === 'quiz') {
			prompt = "Give me a quick 3-question conceptual quiz based on this document with multiple choice options (A, B, C, D). Don't give answers yet — let me solve them first!";
			typingStatus = `Formulating 3-question conceptual quiz from ${previewFile.name}...`;
		} else if (action === 'formulas') {
			prompt = 'Extract all the key formulas, definitions, and high-yield exam traps from this document into a concise cheatsheet.';
			typingStatus = `Scanning ${previewFile.name} & compiling key formulas cheatsheet...`;
		} else {
			autoSend = false;
		}

		// 3. Start extraction asynchronously via Promise without blocking the AI Orb opening!
		let textPromise: Promise<string> | undefined;
		if (previewTextContent) {
			textPromise = Promise.resolve(previewTextContent);
		} else if (previewBlob) {
			isAiExtracting = true;
			aiExtractingProgress = 'Reading...';
			textPromise = (async () => {
				try {
					if (previewFile.mimeType.includes('pdf') || previewFile.name.endsWith('.pdf')) {
						aiExtractingProgress = 'Extracting PDF...';
						const text = await extractTextFromPdfBlob(previewBlob);
						return text || `Document Name: ${previewFile.name}\nSubject: ${SECTION_CONFIG[previewFile.section].name}\nNotes: ${previewFile.notes || 'None'}`;
					} else if (
						previewFile.mimeType.startsWith('text/') ||
						previewFile.name.endsWith('.txt') ||
						previewFile.name.endsWith('.md')
					) {
						return await previewBlob.text();
					}
				} catch (e) {
					console.error("Text extraction failed:", e);
				} finally {
					isAiExtracting = false;
					aiExtractingProgress = '';
				}
				return `Document Name: ${previewFile.name}\nSubject: ${SECTION_CONFIG[previewFile.section].name}\nNotes: ${previewFile.notes || 'None'}`;
			})();
		}

		// 4. Send to AI Mentor immediately so chat opens simultaneously as the spark hits the orb!
		sendToAiMentor({
			doc: {
				fileName: previewFile.name,
				subject: SECTION_CONFIG[previewFile.section].name,
				text: previewTextContent || '',
				status: previewTextContent ? 'ready' : 'extracting'
			},
			prompt,
			typingStatus,
			textPromise,
			autoSend
		});

		celebration.set(
			action === 'flashcards'
				? '⚡ AI generating flashcards from document!'
				: action === 'quiz'
				? '🎯 AI preparing quiz from document!'
				: action === 'formulas'
				? '🔖 AI extracting formulas from document!'
				: '✨ Document attached to AI Mentor Orb!'
		);
	}

	async function handleSendToAiOrb() {
		aiMenuOpen = !aiMenuOpen;
	}

	async function handleSendCardToAi(file: DumpFileMeta, event?: MouseEvent) {
		if (event && event.currentTarget) {
			triggerOrbFlight(event.currentTarget as HTMLElement, '⚡', 'Flashcards');
		}

		celebration.set(`Extracting ${file.name} for AI...`);

		const textPromise = (async () => {
			try {
				const extracted = await extractFileFromSection(userId, file.section, file.name);
				if (!extracted) return `Document: ${file.name}\nSubject: ${SECTION_CONFIG[file.section].name}`;
				if (file.mimeType.includes('pdf') || file.name.endsWith('.pdf')) {
					const text = await extractTextFromPdfBlob(extracted.blob);
					return text || `Document: ${file.name}\nSubject: ${SECTION_CONFIG[file.section].name}`;
				} else if (
					file.mimeType.startsWith('text/') ||
					file.name.endsWith('.txt') ||
					file.name.endsWith('.md')
				) {
					return await extracted.blob.text();
				}
			} catch (e) {
				console.error("Card AI extraction error:", e);
			}
			return `Document: ${file.name}\nSubject: ${SECTION_CONFIG[file.section].name}`;
		})();

		sendToAiMentor({
			doc: {
				fileName: file.name,
				subject: SECTION_CONFIG[file.section].name,
				text: '',
				status: 'extracting'
			},
			prompt: 'Generate 5 high-yield Active Recall flashcards based on this document and save them using the addFlashcards command.',
			typingStatus: `Extracting ${file.name} & generating flashcards...`,
			textPromise,
			autoSend: true
		});

		celebration.set(`⚡ AI generating flashcards for "${file.name}"!`);
	}

	async function handleSyncCloud() {
		isSyncing = true;
		try {
			const res = await syncFromCloudStorage(userId);
			if (res.files.length > 0) {
				updateTracker((t) => {
					if (!t.studyDump) t.studyDump = { files: [] };
					t.studyDump.files = res.files;
					t.studyDump.sectionZipSizes = res.sectionSizes;
					t.studyDump.lastSyncAt = Date.now();
				});
				celebration.set(`Retrieved ${res.files.length} study files across ${res.syncedSections.length} sections!`);
				bannerNotice = {
					type: 'success',
					text: `Successfully synced across devices! Found ${res.files.length} files in Cloud Storage.`
				};
			} else {
				bannerNotice = {
					type: 'warning',
					text: 'No remote ZIP archives found yet. Upload files to create your cloud archives.'
				};
			}
		} catch (e: any) {
			bannerNotice = { type: 'error', text: `Sync error: ${e?.message || String(e)}` };
		} finally {
			isSyncing = false;
		}
	}

	function getFileIcon(mime: string, name: string): 'book' | 'palette' | 'edit' | 'bookmark' | 'layers' {
		if (mime.includes('pdf') || name.endsWith('.pdf')) return 'book';
		if (mime.startsWith('image/')) return 'palette';
		if (mime.includes('text') || name.endsWith('.txt') || name.endsWith('.md')) return 'edit';
		if (name.endsWith('.doc') || name.endsWith('.docx')) return 'bookmark';
		return 'layers';
	}

	onDestroy(() => {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
	});
</script>

<svelte:head>
	<title>Study Dump | BTracker</title>
</svelte:head>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && previewOpen) closePreview(); }} />

<!-- Dropzone overlay when dragging anywhere on screen -->
<div
	class="dump-page"
	class:dragging={isDraggingOver}
	on:dragover={handleDragOver}
	on:dragleave={handleDragLeave}
	on:drop={handleDrop}
	role="region"
	aria-label="Study Dump Files"
>
	{#if isDraggingOver}
		<div class="drag-backdrop" transition:fade={{ duration: 150 }}>
			<div class="drag-modal">
				<div class="drag-icon"><NavIcon name="plus" size={42} /></div>
				<h2>Drop study files to upload</h2>
				<p>Files will be bundled into {SECTION_CONFIG[activeTab === 'all' ? 'P' : activeTab].name} ZIP archive</p>
			</div>
		</div>
	{/if}

	<!-- Header Hero -->
	<header class="dump-header">
		<div class="header-main">
			<div class="title-row">
				<div class="title-group">
					<div class="vault-badge">
						<NavIcon name="layers" size={16} />
						<span>CLOUD ZIP VAULT</span>
					</div>
					<h1>Study Dump</h1>
				</div>

				<div class="cloud-actions">
					<!-- Cloud Sync Status Pill -->
					{#if isCloudActive}
						<div class="cloud-pill connected" title="Connected to Cloud Storage">
							<span class="dot green"></span>
							<span class="pill-label">Cloud Storage: {$currentUser ? 'Synced' : 'Connected'}</span>
						</div>
					{:else}
						<button
							type="button"
							class="cloud-pill local"
							on:click={() => (setupModalOpen = true)}
							title="Click to view Cloud Storage setup instructions"
						>
							<span class="dot yellow"></span>
							<span class="pill-label">Local / Offline Cache</span>
							<span class="pill-hint">Setup Cloud &rarr;</span>
						</button>
					{/if}

					<button
						type="button"
						class="btn-sync"
						disabled={isSyncing}
						on:click={handleSyncCloud}
						title="Fetch latest ZIP manifests from Cloud Storage across all devices"
					>
						<span class:spin={isSyncing}><NavIcon name="pulse" size={15} /></span>
						<span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
					</button>

					<button type="button" class="btn-primary-upload" on:click={() => openUpload()}>
						<NavIcon name="plus" size={16} />
						<span>Upload Files</span>
					</button>
				</div>
			</div>

			<p class="header-desc">
				Store your notes, DPPs, tests & reference PDFs in compressed section ZIPs in Cloud Storage.
				Retrieved on-demand across devices without permanently keeping heavy files on your laptop.
			</p>

			<!-- Quick stats bar -->
			<div class="stats-strip">
				<div class="stat-pill">
					<span class="stat-num">{totalFileCount}</span>
					<span class="stat-lbl">Total Files</span>
				</div>
				<div class="stat-pill">
					<span class="stat-num">{formatBytes(totalStoredBytes)}</span>
					<span class="stat-lbl">Total ZIP Size</span>
				</div>
				<div class="stat-pill">
					<span class="stat-num">
						{['P', 'C', 'M', 'others'].filter((s) => allFiles.some((f) => f.section === s)).length}/4
					</span>
					<span class="stat-lbl">Active Sections</span>
				</div>
			</div>
		</div>

		<!-- Optional Banner Notice -->
		{#if bannerNotice}
			<div class="banner-notice {bannerNotice.type}" transition:slide={{ duration: 200 }}>
				<div class="banner-content">
					<NavIcon
						name={bannerNotice.type === 'success' ? 'check' : bannerNotice.type === 'error' ? 'alert' : 'info'}
						size={16}
					/>
					<span>{bannerNotice.text}</span>
				</div>
				<button type="button" class="btn-close-notice" on:click={() => (bannerNotice = null)}>
					<NavIcon name="x" size={14} />
				</button>
			</div>
		{/if}
	</header>

	<!-- Section Navigation Tabs -->
	<nav class="section-tabs" aria-label="Study Dump Sections">
		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'all'}
			on:click={() => (activeTab = 'all')}
		>
			<span class="tab-label">All Sections</span>
			<span class="count-pill">{totalFileCount}</span>
		</button>

		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'P'}
			on:click={() => (activeTab = 'P')}
			style="--accent-tab: #38bdf8"
		>
			<span class="subject-dot p-dot"></span>
			<span class="tab-label">Physics (P)</span>
			<span class="count-pill">{pCount}</span>
			{#if zipSizes.P}
				<span class="size-pill">{formatBytes(zipSizes.P)}</span>
			{/if}
		</button>

		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'C'}
			on:click={() => (activeTab = 'C')}
			style="--accent-tab: #34d399"
		>
			<span class="subject-dot c-dot"></span>
			<span class="tab-label">Chemistry (C)</span>
			<span class="count-pill">{cCount}</span>
			{#if zipSizes.C}
				<span class="size-pill">{formatBytes(zipSizes.C)}</span>
			{/if}
		</button>

		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'M'}
			on:click={() => (activeTab = 'M')}
			style="--accent-tab: #f472b6"
		>
			<span class="subject-dot m-dot"></span>
			<span class="tab-label">Maths (M)</span>
			<span class="count-pill">{mCount}</span>
			{#if zipSizes.M}
				<span class="size-pill">{formatBytes(zipSizes.M)}</span>
			{/if}
		</button>

		<button
			type="button"
			class="tab-btn"
			class:active={activeTab === 'others'}
			on:click={() => (activeTab = 'others')}
			style="--accent-tab: #a78bfa"
		>
			<span class="subject-dot others-dot"></span>
			<span class="tab-label">Others</span>
			<span class="count-pill">{othersCount}</span>
			{#if zipSizes.others}
				<span class="size-pill">{formatBytes(zipSizes.others)}</span>
			{/if}
		</button>
	</nav>

	<!-- Section Banner Info & Quick Actions -->
	<div class="section-meta-row">
		<div class="section-info">
			{#if activeTab === 'all'}
				<span class="section-title">All Study Materials</span>
				<span class="section-desc">Combined view across Physics, Chemistry, Maths and Others.</span>
			{:else}
				<div class="section-tag-group">
					<span
						class="section-title"
						style="color: {SECTION_CONFIG[activeTab].color};"
					>
						{SECTION_CONFIG[activeTab].name} ({SECTION_CONFIG[activeTab].label})
					</span>
					<span class="section-desc">{SECTION_CONFIG[activeTab].desc}</span>
				</div>
			{/if}
		</div>

		<div class="section-controls">
			<!-- Search filter -->
			<div class="search-wrap">
				<NavIcon name="search" size={15} />
				<input
					type="search"
					placeholder="Search files, tags, notes..."
					bind:value={searchQuery}
					class="search-input"
				/>
				{#if searchQuery}
					<button type="button" class="clear-search" on:click={() => (searchQuery = '')}>
						<NavIcon name="x" size={12} />
					</button>
				{/if}
			</div>

			<!-- Download Section ZIP -->
			{#if activeTab !== 'all' && (allFiles.some((f) => f.section === activeTab))}
				{@const currentSec = activeTab}
				<button
					type="button"
					class="btn-section-zip"
					on:click={() => handleDownloadSectionZip(currentSec)}
					title="Download complete {SECTION_CONFIG[currentSec].name} ZIP archive"
				>
					<NavIcon name="download" size={15} />
					<span>Download {SECTION_CONFIG[currentSec].label} ZIP ({formatBytes(zipSizes[currentSec] || 0)})</span>
				</button>
			{/if}
		</div>
	</div>

	<!-- File Grid / Cards -->
	{#if filteredFiles.length > 0}
		<div class="files-grid">
			{#each filteredFiles as file (file.id)}
				<div class="file-card" transition:scale={{ duration: 150 }}>
					<div class="file-card-top">
						<div
							class="file-icon-box"
							style="background: color-mix(in srgb, {SECTION_CONFIG[file.section].color} 15%, var(--surface-panel)); color: {SECTION_CONFIG[file.section].color};"
						>
							<NavIcon name={getFileIcon(file.mimeType, file.name)} size={22} />
						</div>

						<div class="file-badges">
							<span
								class="sec-badge"
								style="color: {SECTION_CONFIG[file.section].color}; border-color: color-mix(in srgb, {SECTION_CONFIG[file.section].color} 30%, transparent);"
							>
								{SECTION_CONFIG[file.section].name}
							</span>
							<span class="size-badge">{formatBytes(file.size)}</span>
						</div>
					</div>

					<div class="file-meta">
						<h3 class="file-name" title={file.name}>{file.name}</h3>
						{#if file.notes}
							<p class="file-notes" title={file.notes}>{file.notes}</p>
						{/if}
						<div class="file-footer-meta">
							<span class="date-txt">
								{new Date(file.uploadedAt).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
							</span>
							{#if file.tags && file.tags.length > 0}
								<div class="tags-row">
									{#each file.tags as tag}
										<span class="tag-chip">{tag}</span>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<div class="file-card-actions">
						<button
							type="button"
							class="action-btn preview"
							on:click={() => handleOpenPreview(file)}
							title="View in browser (zero disk footprint)"
						>
							<NavIcon name="expand" size={14} />
							<span>View</span>
						</button>
						<button
							type="button"
							class="action-btn ai-btn"
							on:click={(e) => handleSendCardToAi(file, e)}
							title="Send to AI Mentor Orb"
						>
							<NavIcon name="sparkles" size={13} />
							<span>Ask AI</span>
						</button>
						<button
							type="button"
							class="action-btn download"
							on:click={() => handleDownloadSingle(file)}
							title="Download file"
						>
							<NavIcon name="download" size={14} />
							<span>Download</span>
						</button>
						<button
							type="button"
							class="action-btn delete"
							on:click={() => handleDeleteFile(file)}
							title="Remove from ZIP"
						>
							<NavIcon name="trash" size={14} />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Empty State -->
		<div class="empty-state">
			<div class="empty-icon-ring">
				<NavIcon name="layers" size={36} />
			</div>
			{#if searchQuery}
				<h3>No files match "{searchQuery}"</h3>
				<p>Try searching for a different keyword or reset your search query.</p>
				<button type="button" class="btn-primary-upload" on:click={() => (searchQuery = '')}>
					Clear Search
				</button>
			{:else}
				<h3>No study files in {activeTab === 'all' ? 'any section' : SECTION_CONFIG[activeTab].name} yet</h3>
				<p>
					Drop PDFs, images, notes, or formula sheets here. They'll be compressed into a ZIP and saved
					directly in Cloud Storage.
				</p>
				<button
					type="button"
					class="btn-primary-upload"
					on:click={() => openUpload(activeTab === 'all' ? 'P' : activeTab)}
				>
					<NavIcon name="plus" size={16} />
					<span>Upload {activeTab === 'all' ? 'Files' : `to ${SECTION_CONFIG[activeTab].name}`}</span>
				</button>
			{/if}
		</div>
	{/if}

	<!-- Section Archives Overview Row -->
	<section class="section-archives-footer">
		<h2>Section Archives in Cloud Storage</h2>
		<div class="archives-grid">
			{#each (['P', 'C', 'M', 'others'] as const) as sec}
				{@const count = allFiles.filter((f) => f.section === sec).length}
				{@const size = zipSizes[sec] || 0}
				<div class="archive-card">
					<div class="archive-card-header">
						<span class="archive-dot" style="background: {SECTION_CONFIG[sec].color};"></span>
						<div class="archive-titles">
							<h4>{SECTION_CONFIG[sec].name} ({SECTION_CONFIG[sec].label})</h4>
							<span class="archive-sub">{SECTION_CONFIG[sec].desc}</span>
						</div>
					</div>

					<div class="archive-metrics">
						<div class="metric-pair">
							<span class="m-val">{count}</span>
							<span class="m-lbl">files</span>
						</div>
						<div class="metric-pair">
							<span class="m-val">{size > 0 ? formatBytes(size) : 'Empty'}</span>
							<span class="m-lbl">ZIP size</span>
						</div>
					</div>

					<div class="archive-card-btns">
						<button
							type="button"
							class="btn-upload-sec"
							on:click={() => openUpload(sec)}
						>
							<NavIcon name="plus" size={13} />
							<span>Add Files</span>
						</button>
						{#if count > 0}
							<button
								type="button"
								class="btn-download-sec"
								on:click={() => handleDownloadSectionZip(sec)}
							>
								<NavIcon name="download" size={13} />
								<span>Export ZIP</span>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>

<!-- ================= MODALS ================= -->

<!-- Upload Modal -->
<Modal open={uploadModalOpen} title="Upload Study Files to ZIP Vault" width="580px" on:close={() => (uploadModalOpen = false)}>
	<div class="modal-body-upload">
		<div class="field-group">
			<label for="sec-select">Target Section:</label>
			<div class="section-radio-grid">
				{#each (['P', 'C', 'M', 'others'] as const) as sec}
					<button
						type="button"
						id="sec-select"
						class="sec-choice-btn"
						class:selected={selectedUploadSection === sec}
						style="--choice-color: {SECTION_CONFIG[sec].color}"
						on:click={() => (selectedUploadSection = sec)}
					>
						<span class="choice-dot"></span>
						<span class="choice-title">{SECTION_CONFIG[sec].name}</span>
						<span class="choice-code">({SECTION_CONFIG[sec].label})</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Hidden native file input placed outside as sibling to label -->
		<input
			id="dump-file-input"
			type="file"
			multiple
			bind:this={fileInputRef}
			on:change={handleFileSelect}
			class="actual-file-input"
			accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.doc,.docx"
		/>

		<!-- File Drop Box (Clicking anywhere or the button triggers the label natively in Safari, Chrome & Firefox) -->
		<label
			for="dump-file-input"
			class="file-drop-box"
			class:has-files={selectedFiles.length > 0}
			class:dragging-over={isDropBoxDragging}
			on:dragover={handleDropBoxDragOver}
			on:dragleave={handleDropBoxDragLeave}
			on:drop={handleDropBoxDrop}
		>
			<div class="drop-prompt">
				<div class="drop-icon"><NavIcon name="layers" size={36} /></div>
				{#if selectedFiles.length > 0}
					<div class="selected-files-summary">
						<strong>{selectedFiles.length} file(s) selected:</strong>
						<ul class="file-names-list">
							{#each selectedFiles.slice(0, 5) as f}
								<li>{f.name} ({formatBytes(f.size)})</li>
							{/each}
							{#if selectedFiles.length > 5}
								<li>...and {selectedFiles.length - 5} more</li>
							{/if}
						</ul>
						<span class="click-replace">Click to change or replace selected files</span>
					</div>
				{:else}
					<p class="drop-text">Click to browse or drop study files here</p>
					<span class="drop-formats">Supports PDFs, Images, Notes, Formula Sheets, DPPs (Multiple files allowed)</span>
					<span class="btn-browse-trigger">
						<NavIcon name="plus" size={14} />
						<span>Browse Files from Computer</span>
					</span>
				{/if}
			</div>
		</label>

		<!-- Optional Notes / Tag -->
		<div class="form-row">
			<div class="field-group flex-1">
				<label for="file-notes">Description / Topic Notes (Optional):</label>
				<input
					id="file-notes"
					type="text"
					placeholder="e.g. Mechanics Allen Module PYQs"
					bind:value={uploadNotes}
					class="text-input"
				/>
			</div>
			<div class="field-group" style="width: 140px;">
				<label for="file-tag">Category Tag:</label>
				<select id="file-tag" bind:value={uploadTag} class="select-input">
					<option value="">None</option>
					<option value="Notes">Notes</option>
					<option value="Formula">Formula</option>
					<option value="DPP">DPP</option>
					<option value="PYQs">PYQs</option>
					<option value="Test">Test Paper</option>
				</select>
			</div>
		</div>

		<!-- Zero-Laptop-Storage Notice -->
		<div class="info-callout">
			<NavIcon name="shield" size={16} />
			<div>
				<strong>Zero-laptop footprint:</strong> Files are compressed into a single ZIP and uploaded to
				Cloud Storage. They are deleted from local RAM and extracted only on-demand when previewed.
			</div>
		</div>

		<!-- Action Footer -->
		<div class="modal-footer-btns">
			<button
				type="button"
				class="btn-cancel"
				disabled={isUploading}
				on:click={() => (uploadModalOpen = false)}
			>
				Cancel
			</button>
			<button
				type="button"
				class="btn-confirm-upload"
				disabled={selectedFiles.length === 0 || isUploading}
				on:click={performUpload}
			>
				{#if isUploading}
					<span class="spin"><NavIcon name="pulse" size={15} /></span>
					<span>{uploadProgressText || 'Compressing & Syncing...'}</span>
				{:else}
					<NavIcon name="download" size={15} />
					<span>Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''} to ZIP</span>
				{/if}
			</button>
		</div>
	</div>
</Modal>

<!-- In-Browser Ephemeral Study Reader View -->
{#if previewOpen}
	<div
		class="reader-overlay"
		class:fullscreen={isReaderFullscreen}
		transition:fade={{ duration: 150 }}
		role="dialog"
		aria-modal="true"
		aria-label={previewFile ? previewFile.name : 'Document Reader'}
	>
		<div class="reader-shell" class:fullscreen={isReaderFullscreen}>
			<!-- Reader Top Toolbar -->
			<header class="reader-topbar">
				<div class="reader-doc-meta">
					{#if previewFile}
						<span
							class="reader-sec-badge"
							style="background: color-mix(in srgb, {SECTION_CONFIG[previewFile.section].color} 18%, transparent); color: {SECTION_CONFIG[previewFile.section].color}; border-color: color-mix(in srgb, {SECTION_CONFIG[previewFile.section].color} 40%, transparent);"
						>
							{SECTION_CONFIG[previewFile.section].name}
						</span>
						<h2 class="reader-doc-title" title={previewFile.name}>
							{previewFile.name}
						</h2>
						<span class="reader-doc-size">{formatBytes(previewFile.size)}</span>
						{#if previewFile.notes}
							<span class="reader-doc-notes" title={previewFile.notes}>
								"{previewFile.notes}"
							</span>
						{/if}
					{/if}
				</div>

				<div class="reader-actions">
					{#if previewFile}
						<div class="ai-orb-dropdown-wrap">
							<button
								type="button"
								class="reader-btn ai-orb-btn"
								class:active={aiMenuOpen}
								on:click={handleSendToAiOrb}
								disabled={isAiExtracting}
								title="Instant AI actions for this document"
							>
								{#if isAiExtracting}
									<NavIcon name="sparkles" size={13} />
									<span>AI Analyzing...</span>
								{:else}
									<NavIcon name="sparkles" size={13} />
									<span>Ask AI Orb</span>
									<NavIcon name="chevron-down" size={11} />
								{/if}
							</button>

							{#if aiMenuOpen}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="ai-orb-dropdown-menu" transition:fade={{ duration: 120 }}>
									<div class="ai-dropdown-header">
										<NavIcon name="sparkles" size={12} />
										<span>AI Actions for this Doc</span>
									</div>
									<button type="button" class="ai-dropdown-item flashcards" on:click={(e) => handleAiAction('flashcards', e)}>
										<span class="action-emoji">⚡</span>
										<div class="action-col">
											<span class="action-title">Generate 5 Flashcards</span>
											<span class="action-sub">Saves active recall cards directly to deck</span>
										</div>
									</button>
									<button type="button" class="ai-dropdown-item quiz" on:click={(e) => handleAiAction('quiz', e)}>
										<span class="action-emoji">🎯</span>
										<div class="action-col">
											<span class="action-title">Quiz Me (3 Questions)</span>
											<span class="action-sub">Interactive MCQs testing core concepts</span>
										</div>
									</button>
									<button type="button" class="ai-dropdown-item formulas" on:click={(e) => handleAiAction('formulas', e)}>
										<span class="action-emoji">🔖</span>
										<div class="action-col">
											<span class="action-title">Extract Key Formulas</span>
											<span class="action-sub">Cheatsheet of laws, formulas & exam traps</span>
										</div>
									</button>
									<button type="button" class="ai-dropdown-item chat" on:click={(e) => handleAiAction('chat', e)}>
										<span class="action-emoji">💬</span>
										<div class="action-col">
											<span class="action-title">Ask a Doubt / Chat</span>
											<span class="action-sub">Open AI Mentor with this document attached</span>
										</div>
									</button>
								</div>
							{/if}
						</div>
					{/if}

					{#if previewUrl}
						<a
							href={previewUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="reader-btn tab-link"
							title="Open in a full browser tab (great for split screen study on Mac)"
						>
							<NavIcon name="share" size={13} />
							<span>Open in Tab</span>
						</a>

						<button
							type="button"
							class="reader-btn"
							on:click={() => previewFile && handleDownloadSingle(previewFile)}
							title="Download file"
						>
							<NavIcon name="download" size={13} />
							<span>Download</span>
						</button>
					{/if}

					<button
						type="button"
						class="reader-btn icon-only"
						on:click={() => (isReaderFullscreen = !isReaderFullscreen)}
						title={isReaderFullscreen ? 'Exit Fullscreen' : 'Fullscreen Reader'}
					>
						<NavIcon name={isReaderFullscreen ? 'minus' : 'expand'} size={14} />
					</button>

					<button
						type="button"
						class="reader-btn close-btn icon-only"
						on:click={closePreview}
						title="Close Reader (Esc)"
					>
						<NavIcon name="x" size={15} />
					</button>
				</div>
			</header>

			<!-- Reader Viewport -->
			<div class="reader-body">
				{#if previewLoading}
					<div class="preview-spinner">
						<span class="spin"><NavIcon name="pulse" size={36} /></span>
						<p>Extracting document from cloud ZIP in memory...</p>
					</div>
				{:else if previewFile && previewUrl}
					{#if previewFile.mimeType.includes('pdf') || previewFile.name.endsWith('.pdf')}
						<iframe
							src="{previewUrl}#view=FitH"
							title={previewFile.name}
							class="reader-iframe"
						></iframe>
					{:else if previewFile.mimeType.startsWith('image/')}
						<div class="reader-image-wrap">
							<img src={previewUrl} alt={previewFile.name} class="reader-image" />
						</div>
					{:else if previewTextContent !== null}
						<div class="reader-text-wrap">
							<pre class="reader-pre">{previewTextContent}</pre>
						</div>
					{:else}
						<div class="unknown-preview">
							<NavIcon name="book" size={54} />
							<h3>No in-browser preview available</h3>
							<p>This file type can be downloaded directly.</p>
							<button
								type="button"
								class="btn-primary-upload"
								on:click={() => previewFile && handleDownloadSingle(previewFile)}
							>
								Download File ({formatBytes(previewFile.size)})
							</button>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Footer info note -->
			<footer class="reader-footer-bar">
				<span>🔒 Zero-laptop footprint: Streamed temporarily in RAM &mdash; closed safely without keeping files on disk.</span>
			</footer>
		</div>
	</div>
{/if}

<!-- Cloud Storage Setup Instructions Modal -->
<Modal open={setupModalOpen} title="Enable Multi-Device Cloud Storage Sync" width="620px" on:close={() => (setupModalOpen = false)}>
	<div class="setup-modal-content">
		<p>
			BTracker stores your section study files as <code>physics.zip</code>, <code>chemistry.zip</code>,
			<code>maths.zip</code>, and <code>others.zip</code> inside your dedicated Cloud Storage bucket.
		</p>

		<div class="setup-steps">
			<div class="step-item">
				<div class="step-num">1</div>
				<div class="step-info">
					<h4>Add Cloud API keys to <code>.env</code></h4>
					<p>Add these two variables to your project's <code>.env</code> file:</p>
					<pre class="code-box">PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here</pre>
				</div>
			</div>

			<div class="step-item">
				<div class="step-num">2</div>
				<div class="step-info">
					<h4>Create the Storage Bucket</h4>
					<p>
						In your Cloud Dashboard &rarr; <strong>Storage</strong> &rarr; <strong>New Bucket</strong>,
						create a bucket named:
					</p>
					<div class="bucket-pill">
						<code>study-dump</code>
					</div>
					<p class="step-sub">Make it public or set authenticated policies to allow uploads and downloads.</p>
				</div>
			</div>

			<div class="step-item">
				<div class="step-num">3</div>
				<div class="step-info">
					<h4>Cross-Device Retrieval</h4>
					<p>
						Once set up, whenever you open BTracker on any laptop, tablet, or phone and sign in, click
						<strong>"Sync Cloud"</strong> to instantly access all your notes and study archives!
					</p>
				</div>
			</div>
		</div>

		<div class="modal-footer-btns">
			<button type="button" class="btn-confirm-upload" on:click={() => (setupModalOpen = false)}>
				Got it
			</button>
		</div>
	</div>
</Modal>

<style>
	.dump-page {
		max-width: 1280px;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		position: relative;
		min-height: 85vh;
	}

	/* Drag over backdrop */
	.drag-backdrop {
		position: fixed;
		inset: 0;
		background: color-mix(in srgb, var(--surface-canvas, #090a10) 80%, transparent);
		backdrop-filter: blur(8px);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.drag-modal {
		background: var(--surface-panel, #151824);
		border: 2px dashed var(--accent, #6d5dfc);
		border-radius: 1.5rem;
		padding: 3rem 4rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
	}

	.drag-icon {
		color: var(--accent, #6d5dfc);
		margin-bottom: 0.5rem;
	}

	/* Header */
	.dump-header {
		background: var(--surface-panel, rgba(255, 255, 255, 0.05));
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		border-radius: 1rem;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
	}

	.title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.title-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.vault-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent, #6d5dfc);
	}

	.dump-header h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 800;
		color: var(--text-primary, #fff);
	}

	.header-desc {
		margin: 0;
		font-size: 0.88rem;
		color: var(--text-secondary, #94a3b8);
		line-height: 1.5;
		max-width: 800px;
	}

	.cloud-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	/* Cloud status pill */
	.cloud-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.4rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		border: 1px solid transparent;
		background: var(--surface-card, rgba(255, 255, 255, 0.05));
		color: var(--text-secondary, #94a3b8);
	}

	.cloud-pill.local {
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.cloud-pill.local:hover {
		border-color: rgba(234, 179, 8, 0.4);
		background: rgba(234, 179, 8, 0.08);
	}

	.pill-hint {
		color: #eab308;
		font-size: 0.7rem;
		margin-left: 0.25rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.dot.green {
		background: #22c55e;
		box-shadow: 0 0 8px #22c55e;
	}

	.dot.yellow {
		background: #eab308;
		box-shadow: 0 0 8px #eab308;
	}

	.btn-sync {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.9rem;
		border-radius: 0.6rem;
		font-size: 0.82rem;
		font-weight: 600;
		background: var(--surface-card, rgba(255, 255, 255, 0.05));
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		color: var(--text-primary, #fff);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-sync:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.btn-primary-upload {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 1.15rem;
		border-radius: 0.65rem;
		font-size: 0.85rem;
		font-weight: 600;
		background: var(--accent, #6d5dfc);
		color: var(--accent-contrast, #ffffff);
		border: none;
		cursor: pointer;
		box-shadow: 0 4px 14px color-mix(in srgb, var(--accent, #6d5dfc) 35%, transparent);
		transition: transform 0.15s ease, filter 0.15s ease;
	}

	.btn-primary-upload:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.stats-strip {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
		flex-wrap: wrap;
	}

	.stat-pill {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		font-size: 0.82rem;
	}

	.stat-num {
		font-weight: 800;
		font-size: 1rem;
		color: var(--text-primary, #fff);
	}

	.stat-lbl {
		color: var(--text-secondary, #94a3b8);
	}

	/* Notice banner */
	.banner-notice {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-radius: 0.65rem;
		font-size: 0.85rem;
		border: 1px solid transparent;
	}

	.banner-notice.success {
		background: rgba(34, 197, 94, 0.12);
		border-color: rgba(34, 197, 94, 0.3);
		color: #4ade80;
	}

	.banner-notice.warning {
		background: rgba(234, 179, 8, 0.12);
		border-color: rgba(234, 179, 8, 0.3);
		color: #facc15;
	}

	.banner-notice.error {
		background: rgba(239, 68, 68, 0.12);
		border-color: rgba(239, 68, 68, 0.3);
		color: #f87171;
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-close-notice {
		background: transparent;
		border: none;
		color: currentColor;
		cursor: pointer;
		opacity: 0.7;
		padding: 0.2rem;
	}

	.btn-close-notice:hover {
		opacity: 1;
	}

	/* Tabs */
	.section-tabs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 0.25rem;
		scrollbar-width: none;
	}

	.section-tabs::-webkit-scrollbar {
		display: none;
	}

	.tab-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.6rem 1rem;
		border-radius: 0.75rem;
		font-size: 0.85rem;
		font-weight: 600;
		background: var(--surface-panel, rgba(255, 255, 255, 0.04));
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		color: var(--text-secondary, #94a3b8);
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
	}

	.tab-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: var(--text-primary, #fff);
	}

	.tab-btn.active {
		background: color-mix(in srgb, var(--accent-tab, var(--accent, #6d5dfc)) 16%, var(--surface-panel));
		border-color: var(--accent-tab, var(--accent, #6d5dfc));
		color: var(--text-primary, #fff);
	}

	.subject-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.p-dot {
		background: #38bdf8;
	}

	.c-dot {
		background: #34d399;
	}

	.m-dot {
		background: #f472b6;
	}

	.others-dot {
		background: #a78bfa;
	}

	.count-pill {
		padding: 0.15rem 0.45rem;
		border-radius: 9999px;
		font-size: 0.72rem;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.1);
	}

	.size-pill {
		font-size: 0.72rem;
		color: var(--text-secondary, #94a3b8);
		background: rgba(0, 0, 0, 0.2);
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
	}

	/* Section meta row */
	.section-meta-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.section-tag-group {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.section-title {
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--text-primary, #fff);
	}

	.section-desc {
		font-size: 0.8rem;
		color: var(--text-secondary, #94a3b8);
	}

	.section-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.search-wrap {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--surface-panel, rgba(255, 255, 255, 0.05));
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		border-radius: 0.6rem;
		padding: 0.4rem 0.75rem;
		color: var(--text-secondary, #94a3b8);
	}

	.search-input {
		background: transparent;
		border: none;
		color: var(--text-primary, #fff);
		font-size: 0.82rem;
		outline: none;
		width: 180px;
	}

	.clear-search {
		background: transparent;
		border: none;
		color: var(--text-secondary, #94a3b8);
		cursor: pointer;
		padding: 0;
	}

	.btn-section-zip {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.48rem 0.85rem;
		border-radius: 0.6rem;
		font-size: 0.82rem;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
		color: var(--text-primary, #fff);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-section-zip:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	/* Files Grid */
	.files-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.15rem;
	}

	.file-card {
		background: var(--surface-panel, rgba(255, 255, 255, 0.04));
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		border-radius: 1rem;
		padding: 1.15rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 1rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
		transition: transform 0.15s ease, border-color 0.15s ease;
	}

	.file-card:hover {
		transform: translateY(-2px);
		border-color: rgba(255, 255, 255, 0.18);
	}

	.file-card-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.file-icon-box {
		width: 44px;
		height: 44px;
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.file-badges {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.sec-badge {
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 9999px;
		border: 1px solid;
		background: rgba(0, 0, 0, 0.2);
	}

	.size-badge {
		font-size: 0.72rem;
		color: var(--text-secondary, #94a3b8);
	}

	.file-meta {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.file-name {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary, #fff);
		word-break: break-word;
		line-height: 1.35;
	}

	.file-notes {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-secondary, #94a3b8);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.file-footer-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.72rem;
		color: var(--text-secondary, #94a3b8);
		margin-top: 0.25rem;
	}

	.tags-row {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.tag-chip {
		background: rgba(255, 255, 255, 0.08);
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		font-size: 0.68rem;
		font-weight: 600;
	}

	.file-card-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.45rem 0.65rem;
		border-radius: 0.5rem;
		font-size: 0.78rem;
		font-weight: 600;
		border: 1px solid transparent;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.action-btn.preview {
		flex: 1;
		background: color-mix(in srgb, var(--accent, #6d5dfc) 15%, transparent);
		color: var(--accent, #6d5dfc);
		border-color: color-mix(in srgb, var(--accent, #6d5dfc) 30%, transparent);
		justify-content: center;
	}

	.action-btn.preview:hover {
		background: color-mix(in srgb, var(--accent, #6d5dfc) 25%, transparent);
	}

	.action-btn.ai-btn {
		background: color-mix(in srgb, #a855f7 16%, transparent);
		color: #d8b4fe;
		border-color: color-mix(in srgb, #a855f7 35%, transparent);
	}

	.action-btn.ai-btn:hover {
		background: color-mix(in srgb, #a855f7 28%, transparent);
		border-color: #c084fc;
		color: #ffffff;
	}

	.action-btn.download {
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-primary, #fff);
		border-color: var(--border-subtle, rgba(255, 255, 255, 0.1));
	}

	.action-btn.download:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	.action-btn.delete {
		background: transparent;
		color: #f87171;
		padding: 0.45rem;
	}

	.action-btn.delete:hover {
		background: rgba(239, 68, 68, 0.15);
	}

	/* Empty state */
	.empty-state {
		background: var(--surface-panel, rgba(255, 255, 255, 0.03));
		border: 1px dashed var(--border-subtle, rgba(255, 255, 255, 0.12));
		border-radius: 1.25rem;
		padding: 4rem 2rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.empty-icon-ring {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.04);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent, #6d5dfc);
		margin-bottom: 0.5rem;
	}

	.empty-state h3 {
		margin: 0;
		font-size: 1.2rem;
		color: var(--text-primary, #fff);
	}

	.empty-state p {
		margin: 0;
		font-size: 0.88rem;
		color: var(--text-secondary, #94a3b8);
		max-width: 460px;
		line-height: 1.5;
	}

	/* Section Archives Footer */
	.section-archives-footer {
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-archives-footer h2 {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--text-primary, #fff);
	}

	.archives-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
	}

	.archive-card {
		background: var(--surface-panel, rgba(255, 255, 255, 0.04));
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		border-radius: 1rem;
		padding: 1.15rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.archive-card-header {
		display: flex;
		align-items: flex-start;
		gap: 0.65rem;
	}

	.archive-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		margin-top: 0.25rem;
		flex-shrink: 0;
	}

	.archive-titles h4 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary, #fff);
	}

	.archive-sub {
		font-size: 0.75rem;
		color: var(--text-secondary, #94a3b8);
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.archive-metrics {
		display: flex;
		align-items: center;
		justify-content: space-around;
		background: rgba(0, 0, 0, 0.15);
		border-radius: 0.5rem;
		padding: 0.5rem;
	}

	.metric-pair {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.m-val {
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--text-primary, #fff);
	}

	.m-lbl {
		font-size: 0.68rem;
		color: var(--text-secondary, #94a3b8);
		text-transform: uppercase;
	}

	.archive-card-btns {
		display: flex;
		gap: 0.5rem;
	}

	.btn-upload-sec,
	.btn-download-sec {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.45rem;
		border-radius: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-primary, #fff);
		transition: background 0.15s ease;
	}

	.btn-upload-sec:hover,
	.btn-download-sec:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	/* Upload Modal Styles */
	.modal-body-upload {
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field-group label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary, #94a3b8);
	}

	.section-radio-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.sec-choice-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 0.85rem;
		border-radius: 0.65rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
		color: var(--text-secondary, #94a3b8);
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.sec-choice-btn:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.sec-choice-btn.selected {
		background: color-mix(in srgb, var(--choice-color) 15%, transparent);
		border-color: var(--choice-color);
		color: var(--text-primary, #fff);
	}

	.choice-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--choice-color);
	}

	.choice-title {
		font-size: 0.85rem;
		font-weight: 600;
	}

	.choice-code {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.file-drop-box {
		display: block;
		position: relative;
		border: 2px dashed var(--border-subtle, rgba(255, 255, 255, 0.18));
		border-radius: 1rem;
		padding: 2.25rem 1.5rem;
		text-align: center;
		cursor: pointer;
		background: rgba(0, 0, 0, 0.15);
		transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
		user-select: none;
	}

	.file-drop-box:hover,
	.file-drop-box.dragging-over {
		border-color: var(--accent, #6d5dfc);
		background: color-mix(in srgb, var(--accent, #6d5dfc) 8%, transparent);
	}

	.file-drop-box:active {
		transform: scale(0.995);
	}

	.file-drop-box * {
		pointer-events: none;
	}

	.actual-file-input {
		position: absolute;
		width: 0.1px;
		height: 0.1px;
		opacity: 0;
		overflow: hidden;
		z-index: -1;
	}

	.drop-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}

	.btn-browse-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin-top: 0.65rem;
		padding: 0.5rem 1.1rem;
		border-radius: 0.55rem;
		font-size: 0.82rem;
		font-weight: 600;
		background: color-mix(in srgb, var(--accent, #6d5dfc) 20%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent, #6d5dfc) 40%, transparent);
		color: var(--accent, #6d5dfc);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-browse-trigger:hover {
		background: color-mix(in srgb, var(--accent, #6d5dfc) 35%, transparent);
		transform: translateY(-1px);
	}

	.drop-icon {
		color: var(--accent, #6d5dfc);
		margin-bottom: 0.25rem;
	}

	.drop-text {
		margin: 0;
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--text-primary, #fff);
	}

	.drop-formats {
		font-size: 0.75rem;
		color: var(--text-secondary, #94a3b8);
	}

	.selected-files-summary {
		font-size: 0.85rem;
		color: var(--text-primary, #fff);
		width: 100%;
	}

	.file-names-list {
		list-style: none;
		padding: 0;
		margin: 0.4rem 0;
		font-size: 0.8rem;
		color: var(--text-secondary, #94a3b8);
		max-height: 90px;
		overflow-y: auto;
	}

	.click-replace {
		font-size: 0.75rem;
		color: var(--accent, #6d5dfc);
		text-decoration: underline;
	}

	.form-row {
		display: flex;
		gap: 0.75rem;
	}

	.flex-1 {
		flex: 1;
	}

	.text-input,
	.select-input {
		padding: 0.55rem 0.8rem;
		border-radius: 0.55rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
		color: var(--text-primary, #fff);
		font-size: 0.85rem;
		outline: none;
	}

	.text-input:focus,
	.select-input:focus {
		border-color: var(--accent, #6d5dfc);
	}

	.info-callout {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		background: color-mix(in srgb, var(--accent) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
		border-radius: 0.65rem;
		padding: 0.75rem;
		font-size: 0.78rem;
		color: var(--text-secondary, #94a3b8);
		line-height: 1.45;
	}

	.info-callout strong {
		color: var(--text-primary, #fff);
	}

	.modal-footer-btns {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		padding-top: 0.5rem;
	}

	.btn-cancel {
		padding: 0.55rem 1rem;
		border-radius: 0.55rem;
		background: transparent;
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		color: var(--text-secondary, #94a3b8);
		font-size: 0.85rem;
		cursor: pointer;
	}

	.btn-confirm-upload {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 1.25rem;
		border-radius: 0.55rem;
		background: var(--accent, #6d5dfc);
		color: var(--accent-contrast, #ffffff);
		border: none;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--accent, #6d5dfc) 30%, transparent);
	}

	.btn-confirm-upload:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Fullscreen / Expansive Study Reader */
	.reader-overlay {
		position: fixed;
		inset: 0;
		background: color-mix(in srgb, var(--surface-canvas, #000) 65%, rgba(0, 0, 0, 0.75));
		backdrop-filter: var(--vision-glass-blur, blur(24px) saturate(180%));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(24px) saturate(180%));
		z-index: 99999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem;
		box-sizing: border-box;
	}

	.reader-overlay.fullscreen {
		padding: 0;
	}

	.reader-shell {
		width: 95vw;
		max-width: 1480px;
		height: 92vh;
		background: var(--surface-popup-solid, var(--surface-panel));
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: var(--radius-card, 1.25rem);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: var(--shadow-modal), var(--vision-bevel-inner);
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		color: var(--text-primary);
	}

	.reader-shell.fullscreen {
		width: 100%;
		max-width: 100%;
		height: 100dvh;
		border-radius: 0;
		border: none;
	}

	.reader-topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.65rem 1.15rem;
		background: color-mix(in srgb, var(--surface-panel) 92%, var(--surface-subtle));
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.reader-doc-meta {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		overflow: hidden;
		flex: 1;
	}

	.reader-sec-badge {
		font-size: 0.72rem;
		font-weight: 700;
		padding: 0.18rem 0.55rem;
		border-radius: 9999px;
		border: 1px solid;
		flex-shrink: 0;
	}

	.reader-doc-title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.reader-doc-size {
		font-size: 0.72rem;
		color: var(--text-secondary);
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		padding: 0.15rem 0.45rem;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.reader-doc-notes {
		font-size: 0.78rem;
		font-style: italic;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		opacity: 0.85;
	}

	.reader-actions {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-shrink: 0;
	}

	.reader-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.42rem 0.75rem;
		border-radius: var(--radius-control, 8px);
		font-size: 0.78rem;
		font-weight: 600;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		text-decoration: none;
		cursor: pointer;
		transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease, color 0.15s ease;
	}

	.reader-btn:hover {
		background: color-mix(in srgb, var(--accent, #6d5dfc) 12%, var(--surface-subtle));
		border-color: color-mix(in srgb, var(--accent, #6d5dfc) 35%, var(--border-subtle));
		color: var(--accent-strong, var(--accent, #6d5dfc));
	}

	.reader-btn:active {
		transform: scale(0.97);
	}

	.reader-btn.ai-orb-btn {
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent, #6d5dfc) 16%, var(--surface-subtle)), color-mix(in srgb, var(--accent, #6d5dfc) 26%, var(--surface-panel)));
		border: 1px solid color-mix(in srgb, var(--accent, #6d5dfc) 48%, var(--border-subtle));
		color: var(--accent-strong, var(--accent, #6d5dfc));
		font-weight: 700;
		box-shadow: 0 2px 10px color-mix(in srgb, var(--accent, #6d5dfc) 16%, transparent);
	}

	.reader-btn.ai-orb-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent, #6d5dfc) 24%, var(--surface-subtle)), color-mix(in srgb, var(--accent, #6d5dfc) 36%, var(--surface-panel)));
		border-color: var(--accent, #6d5dfc);
		color: var(--accent-strong, var(--accent, #6d5dfc));
		transform: translateY(-1px);
		box-shadow: 0 4px 18px color-mix(in srgb, var(--accent, #6d5dfc) 28%, transparent);
	}

	.reader-btn.ai-orb-btn:disabled {
		opacity: 0.65;
		cursor: wait;
	}

	.ai-orb-dropdown-wrap {
		position: relative;
		display: inline-flex;
	}

	.ai-orb-dropdown-menu {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 300px;
		background: var(--surface-popup-solid, var(--surface-panel));
		backdrop-filter: var(--vision-glass-blur, blur(28px) saturate(190%));
		-webkit-backdrop-filter: var(--vision-glass-blur, blur(28px) saturate(190%));
		border: 1px solid var(--vision-bevel-border, var(--border-subtle));
		border-radius: 14px;
		box-shadow: var(--shadow-modal), 0 0 20px color-mix(in srgb, var(--accent, #6d5dfc) 15%, transparent);
		padding: 6px;
		z-index: 100000;
		display: flex;
		flex-direction: column;
		gap: 4px;
		color: var(--text-primary);
	}

	.ai-dropdown-header {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px 4px;
		font-size: 0.68rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent, #6d5dfc);
		border-bottom: 1px solid var(--border-subtle);
		margin-bottom: 2px;
	}

	.ai-dropdown-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: 9px;
		background: transparent;
		border: 1px solid transparent;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
		color: var(--text-primary);
	}

	.ai-dropdown-item:hover {
		background: var(--surface-subtle);
		border-color: var(--border-subtle);
	}

	.ai-dropdown-item.flashcards:hover {
		background: color-mix(in srgb, #f59e0b 14%, var(--surface-subtle));
		border-color: color-mix(in srgb, #f59e0b 50%, var(--border-subtle));
	}

	.ai-dropdown-item.quiz:hover {
		background: color-mix(in srgb, #38bdf8 14%, var(--surface-subtle));
		border-color: color-mix(in srgb, #38bdf8 50%, var(--border-subtle));
	}

	.ai-dropdown-item.formulas:hover {
		background: color-mix(in srgb, var(--accent, #6d5dfc) 14%, var(--surface-subtle));
		border-color: color-mix(in srgb, var(--accent, #6d5dfc) 50%, var(--border-subtle));
	}

	.ai-dropdown-item.chat:hover {
		background: color-mix(in srgb, #10b981 14%, var(--surface-subtle));
		border-color: color-mix(in srgb, #10b981 50%, var(--border-subtle));
	}

	.action-emoji {
		font-size: 1.15rem;
		flex-shrink: 0;
	}

	.action-col {
		display: flex;
		flex-direction: column;
		gap: 1px;
		overflow: hidden;
	}

	.action-title {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.action-sub {
		font-size: 0.68rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.reader-btn.tab-link {
		background: color-mix(in srgb, var(--accent, #6d5dfc) 14%, var(--surface-subtle));
		color: var(--accent-strong, var(--accent, #6d5dfc));
		border-color: color-mix(in srgb, var(--accent, #6d5dfc) 35%, var(--border-subtle));
	}

	.reader-btn.tab-link:hover {
		background: color-mix(in srgb, var(--accent, #6d5dfc) 24%, var(--surface-subtle));
		color: var(--accent-strong, var(--accent, #6d5dfc));
		border-color: var(--accent, #6d5dfc);
	}

	.reader-btn.icon-only {
		padding: 0.42rem 0.52rem;
	}

	.reader-btn.close-btn:hover {
		background: color-mix(in srgb, var(--danger, #ef4444) 16%, var(--surface-subtle));
		border-color: color-mix(in srgb, var(--danger, #ef4444) 40%, var(--border-subtle));
		color: var(--danger, #ef4444);
	}

	.reader-body {
		flex: 1;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--surface-canvas);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.preview-spinner {
		padding: 4rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		color: var(--text-secondary);
	}

	.reader-iframe {
		width: 100%;
		height: 100%;
		border: none;
		display: block;
		background: var(--surface-canvas);
	}

	.reader-image-wrap {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		overflow: auto;
		background: var(--surface-canvas);
	}

	.reader-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: var(--radius-control, 0.5rem);
		box-shadow: var(--shadow-card);
		border: 1px solid var(--border-subtle);
	}

	.reader-text-wrap {
		width: 100%;
		height: 100%;
		overflow: auto;
		padding: 2rem;
		background: var(--surface-panel);
	}

	.reader-pre {
		margin: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.88rem;
		line-height: 1.6;
		color: var(--text-primary);
		white-space: pre-wrap;
	}

	.unknown-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem;
		color: var(--text-secondary);
	}

	.unknown-preview h3 {
		margin: 0;
		color: var(--text-primary);
	}

	.reader-footer-bar {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.45rem 1rem;
		background: color-mix(in srgb, var(--surface-panel) 92%, var(--surface-subtle));
		border-top: 1px solid var(--border-subtle);
		font-size: 0.72rem;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	/* Setup Modal Styles */
	.setup-modal-content {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		font-size: 0.88rem;
		color: var(--text-secondary, #94a3b8);
		line-height: 1.5;
	}

	.setup-steps {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.step-item {
		display: flex;
		gap: 0.85rem;
	}

	.step-num {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--accent, #6d5dfc);
		color: var(--accent-contrast, #ffffff);
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-size: 0.85rem;
	}

	.step-info h4 {
		margin: 0 0 0.35rem 0;
		font-size: 0.95rem;
		color: var(--text-primary, #fff);
	}

	.step-info p {
		margin: 0 0 0.5rem 0;
	}

	.code-box {
		margin: 0;
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
		border-radius: 0.5rem;
		font-family: monospace;
		font-size: 0.78rem;
		color: #38bdf8;
		overflow-x: auto;
	}

	.bucket-pill {
		display: inline-block;
		margin: 0.25rem 0;
	}

	.bucket-pill code {
		background: color-mix(in srgb, var(--accent) 20%, transparent);
		color: var(--accent, #6d5dfc);
		padding: 0.25rem 0.6rem;
		border-radius: 4px;
		font-weight: 700;
		font-size: 0.9rem;
	}

	.step-sub {
		font-size: 0.78rem;
		opacity: 0.8;
	}

	/* Animations */
	.spin {
		display: inline-block;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.dump-page {
			padding: 1rem 0.75rem calc(max(env(safe-area-inset-bottom), 16px) + 84px);
		}

		.title-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.cloud-actions {
			width: 100%;
			justify-content: space-between;
		}

		.section-radio-grid {
			grid-template-columns: 1fr;
		}

		.form-row {
			flex-direction: column;
		}

		.files-grid {
			grid-template-columns: 1fr;
		}

		.archives-grid {
			grid-template-columns: 1fr;
		}

		.search-wrap {
			width: 100%;
		}

		.search-input {
			width: 100%;
		}

		.reader-overlay {
			padding: 0 !important;
		}

		.reader-shell {
			width: 100% !important;
			max-width: 100% !important;
			height: 100dvh !important;
			border-radius: 0 !important;
			border: none !important;
		}

		.reader-topbar {
			padding: 0.55rem 0.75rem;
			gap: 0.5rem;
		}

		.reader-doc-title {
			font-size: 0.82rem;
			max-width: 130px;
		}

		.reader-doc-notes {
			display: none;
		}

		.reader-text-wrap {
			padding: 1rem 0.75rem;
		}

		.btn-confirm-upload,
		.btn-browse-trigger,
		.btn-cancel {
			min-height: 42px;
		}
	}
</style>
