<script lang="ts">
	export let name:
		| 'home' | 'plan' | 'focus' | 'revise' | 'tests' | 'mastery' | 'friends' | 'stats' | 'reminders'
		| 'menu' | 'plus' | 'minus' | 'sun' | 'moon' | 'settings' | 'chevron' | 'chevron-down' | 'x' | 'check'
		| 'check-circle' | 'circle' | 'share' | 'headphones' | 'expand' | 'lock' | 'sliders' | 'play' | 'pause'
		| 'stop' | 'coffee' | 'sofa' | 'book' | 'flame' | 'layers' | 'target' | 'pulse' | 'bulb' | 'trash'
		| 'drag' | 'search' | 'funnel' | 'library' | 'save' | 'sparkles' | 'crown' | 'brain' | 'sigma' | 'trend'
		| 'clock' | 'calendar-check' | 'history' | 'download' | 'arrow-right' | 'atom' | 'bolt' | 'calculator'
		| 'tv' | 'info' | 'edit' | 'list' | 'quote' | 'reddit' | 'palette' | 'shield' | 'trophy' | 'sunrise' | 'grid' = 'home';
	export let size = 20;
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
	{#if name === 'home'}
		<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-7h6v7" />
	{:else if name === 'plan'}
		<rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 8h8M8 12h8M8 16h4" />
	{:else if name === 'focus'}
		<circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" />
	{:else if name === 'revise'}
		<path d="M20 11a8 8 0 1 0 2 5" /><path d="M20 4v7h-7" />
	{:else if name === 'tests'}
		<path d="M7 3h10v18H7z" /><path d="M9 7h6M9 11h6M9 15h3" />
	{:else if name === 'mastery'}
		<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
	{:else if name === 'friends'}
		<circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0M17 11a2.5 2.5 0 1 0-1.6-4.4M17 14.5a4 4 0 0 1 3.5 4" />
	{:else if name === 'stats'}
		<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
	{:else if name === 'reminders'}
		<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 22h4" />
	{:else if name === 'menu'}
		<path d="M4 7h16M4 12h16M4 17h16" />
	{:else if name === 'plus'}
		<path d="M12 5v14M5 12h14" />
	{:else if name === 'minus'}
		<path d="M5 12h14" />
	{:else if name === 'sun'}
		<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
	{:else if name === 'moon'}
		<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />
	{:else if name === 'settings'}
		<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06-2.12 2.12-.06-.06a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65v.09h-3v-.09A1.8 1.8 0 0 0 10.46 18.7a1.8 1.8 0 0 0-1.98.36l-.06.06-2.12-2.12.06-.06A1.8 1.8 0 0 0 6.72 15a1.8 1.8 0 0 0-1.65-1.1H5v-3h.07A1.8 1.8 0 0 0 6.72 9.8a1.8 1.8 0 0 0-.36-1.98L6.3 7.76l2.12-2.12.06.06a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 11.56 4.4v-.09h3v.09a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.06-.06 2.12 2.12-.06.06a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.1h.09v3h-.09A1.8 1.8 0 0 0 19.4 15Z" />
	{:else if name === 'chevron'}
		<path d="m9 18 6-6-6-6" />
	{:else if name === 'chevron-down'}
		<path d="m6 9 6 6 6-6" />
	{:else if name === 'x'}
		<path d="M18 6 6 18M6 6l12 12" />
	{:else if name === 'check'}
		<path d="m4 12.5 5 5L20 6.5" />
	{:else if name === 'check-circle'}
		<circle cx="12" cy="12" r="9" /><path d="m8.5 12.2 2.4 2.4 4.8-5" />
	{:else if name === 'circle'}
		<circle cx="12" cy="12" r="8.5" />
	{:else if name === 'share'}
		<circle cx="6" cy="12" r="2.6" /><circle cx="17.5" cy="5.5" r="2.6" /><circle cx="17.5" cy="18.5" r="2.6" /><path d="m8.4 10.7 6.8-4M8.4 13.3l6.8 4" />
	{:else if name === 'headphones'}
		<path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="14" width="4.5" height="7" rx="2" /><rect x="16.5" y="14" width="4.5" height="7" rx="2" />
	{:else if name === 'expand'}
		<path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" />
	{:else if name === 'lock'}
		<rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
	{:else if name === 'sliders'}
		<path d="M5 7h14M5 12h14M5 17h14" /><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="7" cy="17" r="2" fill="currentColor" stroke="none" />
	{:else if name === 'play'}
		<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />
	{:else if name === 'pause'}
		<rect x="7" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" /><rect x="13.4" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
	{:else if name === 'stop'}
		<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
	{:else if name === 'coffee'}
		<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" /><path d="M17 9h2.5a2.5 2.5 0 0 1 0 5H17" /><path d="M8 3v2M12 3v2" />
	{:else if name === 'sofa'}
		<path d="M5 10V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v2" /><path d="M3 13a2 2 0 0 1 4 0v1h10v-1a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3Z" /><path d="M6 19v1.5M18 19v1.5" />
	{:else if name === 'book'}
		<path d="M12 6c-1.6-1.6-4-2-7-2v14c3 0 5.4.4 7 2 1.6-1.6 4-2 7-2V4c-3 0-5.4.4-7 2Z" /><path d="M12 6v14" />
	{:else if name === 'flame'}
		<path d="M12 3c1 3-3 4.5-3 8a3.5 3.5 0 0 0 7 0c0-1.5-.7-2.6-1.4-3.6C13.6 6 12.6 4.6 12 3Z" /><path d="M12 21a6.5 6.5 0 0 1-6.5-6.5c0-1.6.5-3 1.3-4.2M12 21a6.5 6.5 0 0 0 6.5-6.5c0-1.6-.5-3-1.3-4.2" />
	{:else if name === 'layers'}
		<path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /><path d="m3 17 9 5 9-5" />
	{:else if name === 'target'}
		<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
	{:else if name === 'pulse'}
		<path d="M2 12h4l3-7 4 14 3-7h6" />
	{:else if name === 'bulb'}
		<path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 1 4 10.5c-.8.7-1 1.5-1 2.5h-6c0-1-.2-1.8-1-2.5A6 6 0 0 1 12 3Z" />
	{:else if name === 'trash'}
		<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M10 11v6M14 11v6" />
	{:else if name === 'drag'}
		<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" />
	{:else if name === 'search'}
		<circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" />
	{:else if name === 'funnel'}
		<path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />
	{:else if name === 'library'}
		<path d="M5 4v16M9 4v16" /><path d="m13 5 5 15" /><path d="M4 20h16" />
	{:else if name === 'save'}
		<path d="M5 4h11l3 3v13H5V4Z" /><path d="M8 4v5h7V4M8 20v-6h8v6" />
	{:else if name === 'sparkles'}
		<path d="m12 4 1.8 4.6L18 10.4l-4.2 1.8L12 17l-1.8-4.8L6 10.4l4.2-1.8L12 4Z" /><path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" />
	{:else if name === 'crown'}
		<path d="m4 8 4 3 4-6 4 6 4-3v9H4V8Z" /><path d="M4 20h16" />
	{:else if name === 'brain'}
		<path d="M9.5 4A3.5 3.5 0 0 0 6 7.5c-1.8.6-3 2-3 4 0 1.6.8 2.9 2 3.6.1 2.4 2 4.4 4.5 4.4.6 0 1.2-.1 1.7-.4V4.6A3.4 3.4 0 0 0 9.5 4Z" /><path d="M14.5 4A3.5 3.5 0 0 1 18 7.5c1.8.6 3 2 3 4 0 1.6-.8 2.9-2 3.6-.1 2.4-2 4.4-4.5 4.4-.6 0-1.2-.1-1.7-.4V4.6A3.4 3.4 0 0 1 14.5 4Z" />
	{:else if name === 'sigma'}
		<path d="M18 5H7l6 7-6 7h11" />
	{:else if name === 'trend'}
		<path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" />
	{:else if name === 'clock'}
		<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" />
	{:else if name === 'calendar-check'}
		<rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /><path d="m9 15 2.2 2.2L15.5 13" />
	{:else if name === 'history'}
		<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.4" /><path d="M3.5 3.5v5h5" /><path d="M12 8v4.5l3 1.8" />
	{:else if name === 'download'}
		<path d="M12 4v11M7.5 11 12 15.5 16.5 11" /><path d="M4 19h16" />
	{:else if name === 'arrow-right'}
		<path d="M4 12h16M14 6l6 6-6 6" />
	{:else if name === 'atom'}
		<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><ellipse cx="12" cy="12" rx="9" ry="3.8" /><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)" />
	{:else if name === 'bolt'}
		<path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
	{:else if name === 'calculator'}
		<rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8.5 7h7" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" stroke-width="2.4" />
	{:else if name === 'tv'}
		<rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="m8 3 4 4 4-4" />
	{:else if name === 'info'}
		<circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.6v.01" stroke-width="2.2" />
	{:else if name === 'edit'}
		<path d="M4 20h4L20 8l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" />
	{:else if name === 'list'}
		<path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
	{:else if name === 'quote'}
		<path d="M9 7c-2.5 0-4 1.8-4 4.2 0 2 1.4 3.4 3.2 3.4.3 0 .6 0 .8-.1-.4 1.4-1.5 2.4-3 2.9M19 7c-2.5 0-4 1.8-4 4.2 0 2 1.4 3.4 3.2 3.4.3 0 .6 0 .8-.1-.4 1.4-1.5 2.4-3 2.9" />
	{:else if name === 'reddit'}
		<circle cx="12" cy="13.5" r="7.5" /><path d="M12 6c.4-2 2-2.6 3.4-2.2" /><circle cx="16.4" cy="3.6" r="1.2" /><circle cx="9.3" cy="12.6" r="1.1" fill="currentColor" stroke="none" /><circle cx="14.7" cy="12.6" r="1.1" fill="currentColor" stroke="none" /><path d="M9 16c1.8 1.2 4.2 1.2 6 0" />
	{:else if name === 'palette'}
		<path d="M12 3a9 9 0 1 0 0 18c1.6 0 2.4-1 2.4-2.1 0-1.5-1.2-1.9-1.2-3 0-1.2 1-2 2.3-2H17a4.5 4.5 0 0 0 4.5-4.5C21.5 6 17.3 3 12 3Z" /><circle cx="8" cy="9" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="7.2" r="1.1" fill="currentColor" stroke="none" /><circle cx="7.4" cy="13.4" r="1.1" fill="currentColor" stroke="none" />
	{:else if name === 'shield'}
		<path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z" />
	{:else if name === 'trophy'}
		<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 5H5a3 3 0 0 0 3 4M16 5h3a3 3 0 0 1-3 4" /><path d="M12 13v3M9 20h6M10 16h4v4h-4z" />
	{:else if name === 'sunrise'}
		<path d="M12 3v5M9 6l3-3 3 3" /><path d="M5 15a7 7 0 0 1 14 0" /><path d="M2 19h20M4 15H2M22 15h-2" />
	{:else if name === 'grid'}
		<rect x="4" y="4" width="4.6" height="4.6" rx="1.4" /><rect x="9.7" y="4" width="4.6" height="4.6" rx="1.4" /><rect x="15.4" y="4" width="4.6" height="4.6" rx="1.4" />
		<rect x="4" y="9.7" width="4.6" height="4.6" rx="1.4" /><rect x="9.7" y="9.7" width="4.6" height="4.6" rx="1.4" fill="currentColor" stroke="none" /><rect x="15.4" y="9.7" width="4.6" height="4.6" rx="1.4" />
		<rect x="4" y="15.4" width="4.6" height="4.6" rx="1.4" /><rect x="9.7" y="15.4" width="4.6" height="4.6" rx="1.4" /><rect x="15.4" y="15.4" width="4.6" height="4.6" rx="1.4" />
	{:else}
		<path d="m9 18 6-6-6-6" />
	{/if}
</svg>
