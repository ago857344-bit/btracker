<svelte:head><title>Reminders · BTracker</title></svelte:head>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import NavIcon from '$lib/components/NavIcon.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { subjectColor, subjectName, SUBJECTS } from '$lib/state/subjects';
	import { addDaysKey, dayKeyOf, parseKey, todayKey } from '$lib/state/dates';
	import { tracker, updateTracker, triggerToast } from '$lib/stores/tracker';
	import type { CustomReminder } from '$lib/types/tracker';
	import { hasNotificationPermission, requestNotificationPermission, checkDueReminders } from '$lib/utils/notifications';
	import { allRevisionReminders } from '$lib/stores/recall-selectors';
	import { boostChapterFromPractice } from '$lib/stores/recall-actions';

	type IconKind = 'reminders' | 'clock' | 'calendar-check' | 'brain' | 'target' | 'flame' | 'bell';

	interface ReminderCard {
		id: string;
		group: 'overdue' | 'today' | 'week';
		icon: IconKind;
		tone: 'danger' | 'accent' | 'warning' | 'success';
		title: string;
		blurb: string;
		when: string;
		sub?: string;
		source?: 'homework' | 'revision' | 'deadline' | 'custom';
		linkId?: string;
		dismissed?: boolean;
		createdAt?: number;
	}

	/* ---------------- modal state ---------------- */
	let newOpen = false;
	let draftKind: 'deadline' | 'spaced' | 'nudge' = 'nudge';
	let draftTitle = '';
	let draftSub = '';
	let draftWhen = '';
	let draftTime = '09:00';
	let draftBlurb = '';
	let notifGranted = false;

	onMount(() => {
		notifGranted = hasNotificationPermission();
		checkDueReminders($tracker.customReminders);
		const interval = setInterval(() => {
			checkDueReminders($tracker.customReminders);
		}, 30000);
		return () => clearInterval(interval);
	});

	const snoozeOptions = ['10 min', '1 hour', 'Tomorrow'] as const;
	let snoozeMenu: string | null = null;

	/* ---------------- derived groups ---------------- */
	const now = new Date();
	const today = todayKey();
	const weekEnd = addDaysKey(today, 6);

	let revCards: ReminderCard[] = [];
	let hwCards: ReminderCard[] = [];
	let dlCards: ReminderCard[] = [];
	let allCards: ReminderCard[] = [];
	let overdue: ReminderCard[] = [];
	let todayGroup: ReminderCard[] = [];
	let week: ReminderCard[] = [];
	let dismissedIds = new Set<string>();

	$: {
		revCards = $allRevisionReminders
			.filter((item) => !dismissedIds.has(item.id))
			.map((item) => {
				const isOverdue = item.group === 'overdue';
				const isToday = item.group === 'today';
				const tone: ReminderCard['tone'] = isOverdue ? 'danger' : isToday ? 'warning' : 'accent';
				const scoreStr = Math.round(item.currentScore);
				const blurb = item.group === 'week'
					? `Spaced repetition reminder · Memory retention: ${scoreStr}% (${item.health === 'fresh' ? 'Fresh' : 'Good'})`
					: `Spaced repetition nudge — Retention is at ${scoreStr}% (Health: ${isOverdue ? 'Critical' : 'Fading'})`;

				return {
					id: item.id,
					group: item.group,
					icon: 'brain' as IconKind,
					tone,
					title: `Revise ${subjectName(item.subject) || item.subject} · Ch. ${item.chapterName}`,
					blurb,
					when: item.dueDate,
					sub: item.subject,
					source: 'revision',
					linkId: item.chapterKey
				} as ReminderCard;
			});

		hwCards = [...$tracker.h, ...$tracker.hd]
			.filter((t) => !t.done && t.due)
			.map((t) => {
				const due = t.due!;
				const overdue_ = due < today;
				const sameDay = due === today;
				return {
					id: `hw-${t.id}`,
					group: overdue_ ? 'overdue' : sameDay ? 'today' : due <= weekEnd ? 'week' : null,
					icon: 'calendar-check' as IconKind,
					tone: overdue_ ? 'danger' : sameDay ? 'accent' : 'warning',
					title: t.title ?? `${subjectName(t.s) || t.s || 'Task'} ${t.ch ? `· Ch.${t.ch}` : ''}`,
					blurb: [
					t.st && t.en ? `${t.st}–${t.en}` : t.st ? t.st : null,
					t.hrs ? `${t.hrs}h budget` : null,
					t.test ? 'Test-weighted' : null,
					Array.isArray(t.subs) && t.subs.length ? `${t.subs.length} sub-tasks` : null
				].filter(Boolean).join(' · ') || 'Planned homework',
					when: due,
					sub: t.s,
					source: 'homework',
					linkId: t.id
				} as ReminderCard;
			})
			.filter((c) => c.group !== null) as ReminderCard[];

		dlCards = $tracker.dl
			.filter((d) => !d.hidden)
			.map((d) => {
				const due = d.date;
				const overdue_ = due < today;
				const sameDay = due === today;
				const wk = due <= weekEnd && due > today;
				if (!overdue_ && !sameDay && !wk) return null;
				return {
					id: `dl-${d.id}`,
					group: overdue_ ? 'overdue' : sameDay ? 'today' : 'week',
					icon: 'target' as IconKind,
					tone: overdue_ ? 'danger' : sameDay ? 'accent' : 'warning',
					title: d.name,
					blurb: [d.time && `At ${d.time}`, d.goals && `${d.goals}`, d.reflect && `Reflect: ${d.reflect}`].filter(Boolean).join(' · ') || 'Scheduled deadline',
					when: due,
					source: 'deadline',
					linkId: d.id
				} as ReminderCard;
			})
			.filter((c) => c !== null) as ReminderCard[];

		const refreshedCustom = ($tracker.customReminders || [])
			.filter((c) => !c.dismissed)
			.map((c) => {
				const datePart = c.when.slice(0, 10);
				const isOverdue = datePart < today;
				const isToday = datePart === today;
				return {
					id: c.id,
					group: (isOverdue ? 'overdue' : isToday ? 'today' : 'week') as 'overdue' | 'today' | 'week',
					tone: (isOverdue ? 'danger' : isToday ? 'accent' : 'warning') as 'danger' | 'accent' | 'warning',
					icon: (c.kind === 'spaced' ? 'brain' : c.kind === 'deadline' ? 'target' : 'flame') as IconKind,
					title: c.title,
					blurb: c.blurb,
					when: c.when,
					sub: c.sub,
					source: 'custom' as const,
					dismissed: c.dismissed,
					createdAt: c.createdAt
				};
			});

		allCards = [
			...refreshedCustom,
			...revCards,
			...hwCards,
			...dlCards
		].sort((a, b) => (a.when > b.when ? 1 : a.when < b.when ? -1 : 0));

		overdue = allCards.filter((c) => c.group === 'overdue');
		todayGroup = allCards.filter((c) => c.group === 'today');
		week = allCards.filter((c) => c.group === 'week');
	}

	let sourceFilter: 'all' | 'revision' | 'homework' | 'deadline' | 'custom' = 'all';

	$: filteredOverdue = overdue.filter((c) => sourceFilter === 'all' || c.source === sourceFilter);
	$: filteredTodayGroup = todayGroup.filter((c) => sourceFilter === 'all' || c.source === sourceFilter);
	$: filteredWeek = week.filter((c) => sourceFilter === 'all' || c.source === sourceFilter);

	function snoozeAllOverdueToTomorrow() {
		const tomorrow = addDaysKey(todayKey(), 1);
		let snoozedCount = 0;

		updateTracker((s) => {
			for (const c of overdue) {
				if (c.source === 'revision' && c.linkId) {
					const chap = s.rev.chapters[c.linkId];
					if (chap) {
						chap.nextRevisionDate = tomorrow;
						snoozedCount++;
					}
				} else if (c.source === 'custom') {
					if (s.customReminders) {
						s.customReminders = s.customReminders.map((item) => {
							if (item.id === c.id) {
								snoozedCount++;
								return { ...item, when: `${tomorrow}T09:00`, dismissed: false, updatedAt: Date.now() };
							}
							return item;
						});
					}
				}
			}
		});

		triggerToast(`Snoozed ${snoozedCount} overdue reminder${snoozedCount === 1 ? '' : 's'} to tomorrow ⏰`);
	}

	/* ---------------- actions ---------------- */
	function markRevisionComplete(key: string, cardId?: string) {
		boostChapterFromPractice(key);
		if (cardId) dismissedIds = new Set([...dismissedIds, cardId]);
		dismissedIds = new Set([...dismissedIds, `rev-${key}`, key]);
		triggerToast('Revision marked complete! Memory restored to 100%');
	}

	function dismiss(id: string) {
		if (id.startsWith('rev-')) {
			const rawKey = id.slice(4);
			const parts = rawKey.split(/[-:]/);
			const sub = parts[0];
			const ch = parts.slice(1).join('-');
			const colonKey = `${sub}:${ch}`;
			const hyphenKey = `${sub}-${ch}`;

			updateTracker((s) => {
				if (s.rev.items[colonKey]) s.rev.items[colonKey].remindDone = true;
				if (s.rev.items[hyphenKey]) s.rev.items[hyphenKey].remindDone = true;
				const chap = s.rev.chapters[hyphenKey] || s.rev.chapters[colonKey];
				if (chap) {
					chap.nextRevisionDate = addDaysKey(todayKey(), 1);
				}
			});
			dismissedIds = new Set([...dismissedIds, id]);
			triggerToast({
				text: 'Revision reminder dismissed',
				actionLabel: 'Undo',
				onAction: () => {
					updateTracker((s) => {
						if (s.rev.items[colonKey]) s.rev.items[colonKey].remindDone = false;
						if (s.rev.items[hyphenKey]) s.rev.items[hyphenKey].remindDone = false;
					});
					const next = new Set(dismissedIds);
					next.delete(id);
					dismissedIds = next;
				}
			});
			return;
		}
		if (id.startsWith('hw-')) {
			const hwId = id.slice(3);
			let wasKeep = false;
			updateTracker((s) => {
				const found = s.h.find((h) => h.id === hwId) || s.hd.find((h) => h.id === hwId);
				if (found) {
					wasKeep = !!found.keep;
					found.keep = true;
				}
			});
			triggerToast({
				text: 'Task reminder dismissed',
				actionLabel: 'Undo',
				onAction: () => {
					updateTracker((s) => {
						const found = s.h.find((h) => h.id === hwId) || s.hd.find((h) => h.id === hwId);
						if (found) found.keep = wasKeep;
					});
				}
			});
			return;
		}
		if (id.startsWith('dl-')) {
			const dlId = id.slice(3);
			updateTracker((s) => {
				const found = s.dl.find((d) => d.id === dlId);
				if (found) found.hidden = true;
			});
			triggerToast({
				text: 'Deadline reminder dismissed',
				actionLabel: 'Undo',
				onAction: () => {
					updateTracker((s) => {
						const found = s.dl.find((d) => d.id === dlId);
						if (found) found.hidden = false;
					});
				}
			});
			return;
		}

		const target = ($tracker.customReminders || []).find((c) => c.id === id);
		if (target) {
			updateTracker((s) => {
				s.customReminders = (s.customReminders || []).map((c) =>
					c.id === id ? { ...c, dismissed: true, updatedAt: Date.now() } : c
				);
			});
			snoozeMenu = null;
			triggerToast({
				text: `Dismissed reminder "${target.title}"`,
				actionLabel: 'Undo',
				onAction: () => {
					updateTracker((s) => {
						s.customReminders = (s.customReminders || []).map((c) =>
							c.id === id ? { ...c, dismissed: false, updatedAt: Date.now() } : c
						);
					});
				}
			});
		}
	}

	function deleteCustom(id: string) {
		const target = ($tracker.customReminders || []).find((c) => c.id === id);
		if (!target) return;
		updateTracker((s) => {
			s.customReminders = (s.customReminders || []).filter((c) => c.id !== id);
		});
		triggerToast({
			text: `Deleted reminder "${target.title}"`,
			actionLabel: 'Undo',
			onAction: () => {
				updateTracker((s) => {
					s.customReminders = [...(s.customReminders || []), target];
				});
			}
		});
	}

	function snooze(id: string, option: typeof snoozeOptions[number]) {
		if (id.startsWith('rev-')) {
			const rawKey = id.slice(4);
			const parts = rawKey.split(/[-:]/);
			const sub = parts[0];
			const ch = parts.slice(1).join('-');
			const colonKey = `${sub}:${ch}`;
			const hyphenKey = `${sub}-${ch}`;

			const daysToAdd = 1;
			const nextDate = addDaysKey(todayKey(), daysToAdd);

			updateTracker((s) => {
				if (s.rev.items[colonKey]) s.rev.items[colonKey].remindDate = nextDate;
				if (s.rev.items[hyphenKey]) s.rev.items[hyphenKey].remindDate = nextDate;
				const chap = s.rev.chapters[hyphenKey] || s.rev.chapters[colonKey];
				if (chap) {
					chap.nextRevisionDate = nextDate;
				}
			});
			snoozeMenu = null;
			dismissedIds = new Set([...dismissedIds, id]);
			triggerToast({
				text: `Revision snoozed until ${nextDate}`
			});
			return;
		}

		const target = ($tracker.customReminders || []).find((c) => c.id === id);
		if (target) {
			const dateObj = new Date();
			let newWhen = target.when;
			if (option === '10 min') {
				dateObj.setMinutes(dateObj.getMinutes() + 10);
				newWhen = `${dayKeyOf(dateObj)}T${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
			} else if (option === '1 hour') {
				dateObj.setHours(dateObj.getHours() + 1);
				newWhen = `${dayKeyOf(dateObj)}T${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
			} else if (option === 'Tomorrow') {
				dateObj.setDate(dateObj.getDate() + 1);
				newWhen = `${dayKeyOf(dateObj)}T09:00`;
			}
			updateTracker((s) => {
				s.customReminders = (s.customReminders || []).map((c) =>
					c.id === id ? { ...c, when: newWhen, dismissed: false, updatedAt: Date.now() } : c
				);
			});
			snoozeMenu = null;
			triggerToast({
				text: `Snoozed until ${newWhen.replace('T', ' ')}`
			});
			return;
		}
		dismiss(id);
	}

	function toneClasses(tone: ReminderCard['tone']) {
		switch (tone) {
			case 'danger':  return { bg: 'color-mix(in srgb, var(--danger), transparent 88%)', fg: 'var(--danger)', ring: 'color-mix(in srgb, var(--danger), transparent 60%)' };
			case 'warning': return { bg: 'color-mix(in srgb, var(--warning), transparent 86%)', fg: 'var(--warning)', ring: 'color-mix(in srgb, var(--warning), transparent 60%)' };
			case 'success': return { bg: 'color-mix(in srgb, var(--success), transparent 86%)', fg: 'var(--success)', ring: 'color-mix(in srgb, var(--success), transparent 60%)' };
			default:        return { bg: 'var(--accent-soft)', fg: 'var(--accent)', ring: 'var(--accent)' };
		}
	}

	function formatWhen(iso: string) {
		if (!iso) return '';
		const d = parseKey(iso);
		const diffDays = Math.round((+d - +parseKey(today)) / 86400000);
		if (diffDays === 0) return 'Today';
		if (diffDays === -1) return 'Yesterday';
		if (diffDays === 1) return 'Tomorrow';
		if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
		if (diffDays < 7) return `${d.toLocaleDateString('en-US', { weekday: 'short' })} · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function sourcePill(source?: ReminderCard['source']) {
		switch (source) {
			case 'revision': return { label: 'Spaced', cls: 'pill spaced' };
			case 'homework': return { label: 'Task', cls: 'pill task' };
			case 'deadline': return { label: 'Deadline', cls: 'pill deadline' };
			case 'custom':   return { label: 'Nudge', cls: 'pill nudge' };
			default:         return null;
		}
	}

	function submitNew() {
		const title = draftTitle.trim();
		if (!title) return;
		const when = draftWhen || today;
		const newReminder: CustomReminder = {
			id: `cus-${Date.now()}`,
			kind: draftKind,
			title,
			blurb: draftBlurb.trim() || (draftKind === 'spaced' ? 'Spaced repetition reminder' : draftKind === 'deadline' ? 'Scheduled deadline' : 'Quick nudge for later'),
			when: `${when}T${draftTime}`,
			sub: draftSub || undefined,
			dismissed: false,
			createdAt: Date.now(),
			updatedAt: Date.now()
		};
		updateTracker((s) => {
			s.customReminders = [...(s.customReminders || []), newReminder];
		});
		newOpen = false;
		draftTitle = ''; draftBlurb = ''; draftWhen = ''; draftSub = ''; draftTime = '09:00'; draftKind = 'nudge';
		triggerToast('Reminder scheduled!');
	}
</script>

<section class="reminders">
	<header class="page-header page-head">
		<div class="page-header-copy titles">
			<p class="page-eyebrow">Smart Alert Center</p>
			<h1 class="page-title">Reminders</h1>
			<p class="page-subtitle sub">Time-sensitive alerts and scheduled nudges — revision triggers, deadlines, and nudges you set for yourself.</p>
		</div>
		<div class="page-header-actions head-actions">
			{#if !notifGranted}
				<button type="button" class="notif-pill" on:click={async () => {
					const res = await requestNotificationPermission();
					notifGranted = res === 'granted';
					if (notifGranted) triggerToast('Desktop notifications enabled!');
				}} title="Enable browser alerts for due reminders">
					<NavIcon name="bell" size={13} />
					<span>Enable Alerts</span>
				</button>
			{/if}
			<div class="count-chip" title="Active alerts">
				<span class="pulse"></span>
				<b>{allCards.length}</b>
				<small>active</small>
			</div>
			<button type="button" class="btn btn-primary set-reminder" on:click={() => (newOpen = true)}>
				<NavIcon name="plus" size={15} />
				<span>Set reminder</span>
			</button>
		</div>
	</header>

	<div class="filter-bar segmented-control" role="tablist" aria-label="Filter reminders by source">
		<button type="button" class:active={sourceFilter === 'all'} on:click={() => sourceFilter = 'all'}>All</button>
		<button type="button" class:active={sourceFilter === 'revision'} on:click={() => sourceFilter = 'revision'}>Spaced Recall</button>
		<button type="button" class:active={sourceFilter === 'homework'} on:click={() => sourceFilter = 'homework'}>Tasks</button>
		<button type="button" class:active={sourceFilter === 'deadline'} on:click={() => sourceFilter = 'deadline'}>Deadlines</button>
		<button type="button" class:active={sourceFilter === 'custom'} on:click={() => sourceFilter = 'custom'}>Custom Nudges</button>
	</div>

	{#each (['overdue', 'today', 'week'] as const) as key}
		{@const cards = key === 'overdue' ? filteredOverdue : key === 'today' ? filteredTodayGroup : filteredWeek}
		{@const head = key === 'overdue' ? 'Overdue' : key === 'today' ? 'Today' : 'Later this week'}
		{@const count = cards.length}
		<section class="group">
			<div class="group-head">
				<h2 class:urgent={key === 'overdue'}>
					{#if key === 'overdue'}<NavIcon name="flame" size={14} />
					{:else if key === 'today'}<NavIcon name="clock" size={14} />
					{:else}<NavIcon name="calendar-check" size={14} />{/if}
					{head}
				</h2>
				<span class="count">{count}</span>

				{#if key === 'overdue' && cards.length > 1}
					<button type="button" class="snooze-all-btn" on:click={snoozeAllOverdueToTomorrow} title="Snooze all overdue reminders to tomorrow">
						<NavIcon name="clock" size={13} />
						<span>Snooze All to Tomorrow</span>
					</button>
				{/if}
			</div>

			{#if count}
				<div class="card-stack">
					{#each cards as card (card.id)}
						{@const tone = toneClasses(card.tone)}
						{@const pill = sourcePill(card.source)}
						<article class="r-card" class:leaving={card.dismissed} style="--card-tone-ring: {tone.ring}">
							<span class="icon-wrap" style="background: {tone.bg}; color: {tone.fg}">
								<NavIcon name={card.icon} size={19} />
							</span>
							<div class="r-copy">
								<div class="r-head">
									<div class="r-title-row">
										<h3>{card.title}</h3>
										{#if pill}<span class={pill.cls}>{pill.label}</span>{/if}
									</div>
									<span class="when" style="color: {tone.fg}">
										<NavIcon name={card.group === 'overdue' ? 'clock' : 'calendar-check'} size={12} />
										{formatWhen(card.when.slice(0, 10))}
										{#if card.when.length > 11 && /T\d\d:\d\d/.test(card.when)}
											· {card.when.slice(11, 16)}
										{/if}
									</span>
								</div>
								<p class="r-blurb">
									{#if card.sub}<i class="sdot" style="background: {subjectColor(card.sub)}"></i><b>{subjectName(card.sub) || card.sub}</b> · {/if}
									{card.blurb}
								</p>
							</div>
							<div class="r-actions">
								<div class="snooze-wrap" role="presentation" on:click|stopPropagation={() => {}} on:keydown|stopPropagation={() => {}}>
									<button type="button" class="link snooze-btn" on:click={() => (snoozeMenu = snoozeMenu === card.id ? null : card.id)}>
										<NavIcon name="clock" size={13} />
										Snooze
										<NavIcon name="chevron-down" size={12} />
									</button>
									{#if snoozeMenu === card.id}
										<div class="snooze-pop" role="menu" tabindex="-1" on:click|stopPropagation={() => {}} on:keydown|stopPropagation={() => {}}>
											{#each snoozeOptions as opt}
												<button type="button" role="menuitem" on:click={() => { snooze(card.id, opt); snoozeMenu = null; }}>{opt}</button>
											{/each}
										</div>
									{/if}
								</div>
								{#if card.source === 'revision'}
									<button type="button" class="link snooze-btn" style="color: var(--success); font-weight: 700;" on:click={() => markRevisionComplete(card.linkId || card.id.slice(4), card.id)}>
										<NavIcon name="check" size={13} /> Mark revised
									</button>
									<a href="/revise" class="link snooze-btn" style="color: var(--accent); font-weight: 700; text-decoration: none;">
										<NavIcon name="arrow-right" size={13} /> Open Hub
									</a>
								{/if}
									<button type="button" class="link dismiss" on:click={() => dismiss(card.id)}>
										<NavIcon name="x" size={13} />
										Dismiss
									</button>
									{#if card.source === 'custom'}
										<button type="button" class="link dismiss del-btn" title="Delete reminder" on:click={() => deleteCustom(card.id)}>
											<NavIcon name="trash" size={13} />
										</button>
									{/if}
								</div>
						</article>
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<div class="empty-state-badge">
						<NavIcon name={key === 'overdue' ? 'check-circle' : key === 'today' ? 'sunrise' : 'shield'} size={22} />
					</div>
					<h3 class="empty-state-title">No {key === 'overdue' ? 'overdue' : key === 'today' ? 'alerts for today' : 'upcoming reminders'}</h3>
					<p class="empty-state-desc">{key === 'overdue'
						? 'You are all caught up — nothing has slipped past.'
						: key === 'today'
						? 'Nothing scheduled for today. Hit "Set reminder" to add one.'
						: 'Nothing queued for the next 6 days.'}</p>
					{#if key === 'today'}
						<button type="button" class="btn empty-state-action" on:click={() => (newOpen = true)}>
							<NavIcon name="plus" size={14} /> Set reminder
						</button>
					{/if}
				</div>
			{/if}
		</section>
	{/each}
</section>

<Modal bind:open={newOpen} title="Set a reminder" width="520px">
	<div class="form">
		<div class="kind-row" role="tablist">
			{#each (['nudge', 'spaced', 'deadline'] as const) as k}
				<button type="button" role="tab" aria-selected={draftKind === k} class:selected={draftKind === k} on:click={() => (draftKind = k)}>
					{#if k === 'nudge'}<NavIcon name="flame" size={13} /> Quick nudge
					{:else if k === 'spaced'}<NavIcon name="brain" size={13} /> Spaced review
					{:else}<NavIcon name="target" size={13} /> Deadline{/if}
				</button>
			{/each}
		</div>

		<label class="field">
			<small>Title</small>
			<input type="text" bind:value={draftTitle} placeholder="e.g. Finish Thermodynamics formulas" />
		</label>

		<div class="row-2">
			<label class="field">
				<small>Date</small>
				<input type="date" bind:value={draftWhen} min={today} />
			</label>
			<label class="field">
				<small>Time</small>
				<input type="time" bind:value={draftTime} />
			</label>
		</div>

		<label class="field">
			<small>Subject (optional)</small>
			<select bind:value={draftSub}>
				<option value="">— No subject —</option>
				{#each SUBJECTS as s}<option value={s.code}>{s.name}</option>{/each}
			</select>
		</label>

		<label class="field">
			<small>Notes (optional)</small>
			<textarea rows="3" bind:value={draftBlurb} placeholder="What should you remember when this fires?"></textarea>
		</label>
	</div>

	<svelte:fragment slot="footer">
		<button type="button" class="ghost" on:click={() => { newOpen = false; draftTitle = ''; draftBlurb = ''; draftWhen = ''; draftSub = ''; }}>Cancel</button>
		<button type="button" class="solid" disabled={!draftTitle.trim()} on:click={submitNew}>
			<NavIcon name="plus" size={14} /> Create reminder
		</button>
	</svelte:fragment>
</Modal>

<style>
	.reminders { display: grid; gap: 1.5rem; }

	.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
	.titles { max-width: 620px; }
	h1 { margin: 0; font-size: clamp(1.7rem, 3.4vw, 2.2rem); font-weight: 850; letter-spacing: -.055em; }
	.sub { margin: .5rem 0 0; color: var(--text-secondary); font-size: .92rem; line-height: 1.6; }
	.head-actions { display: flex; align-items: center; gap: .7rem; }
	.notif-pill { display: inline-flex; align-items: center; gap: .45rem; height: 38px; padding: 0 .9rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: color-mix(in srgb, var(--accent), transparent 90%); color: var(--accent); font-size: .78rem; font-weight: 750; cursor: pointer; transition: all .16s ease; font-family: inherit; }
	.notif-pill:hover { background: var(--accent-soft); border-color: var(--accent); }
	.count-chip { display: inline-flex; align-items: center; gap: .45rem; height: 38px; padding: 0 .9rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-panel); font-size: .74rem; color: var(--text-secondary); }
	.count-chip b { color: var(--text-primary); font-size: .94rem; font-weight: 800; letter-spacing: -.02em; }
	.count-chip .pulse { display: block; width: 8px; height: 8px; border-radius: 999px; background: var(--accent); box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent), transparent 50%); animation: pulse 2.2s infinite; }
	@keyframes pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent), transparent 60%); } 70% { box-shadow: 0 0 0 10px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
	.set-reminder { display: inline-flex; align-items: center; gap: .45rem; height: 38px; padding: 0 1rem; border: 1px solid var(--border-subtle); border-radius: 999px; background: var(--surface-panel); color: var(--text-primary); font-size: .8rem; font-weight: 750; transition: all .16s ease; }
	.set-reminder:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

	.group { display: grid; gap: .6rem; }
	.filter-bar { margin-bottom: 0.75rem; align-self: flex-start; }
	.snooze-all-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.22rem 0.65rem;
		border-radius: 99px;
		background: var(--surface-subtle);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		font-size: 0.72rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-left: 0.5rem;
	}
	.snooze-all-btn:hover {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		border-color: var(--accent);
		color: var(--text-primary);
	}
	.group-head { display: flex; align-items: center; gap: .55rem; padding: 0 .25rem .15rem; }
	.group-head h2 { display: inline-flex; align-items: center; gap: .4rem; margin: 0; font-size: .72rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--text-secondary); }
	.group-head h2.urgent { color: color-mix(in srgb, var(--danger, #e0455a) 45%, var(--text-primary)); }
	.group-head .count { margin-left: auto; display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; background: var(--surface-subtle); color: var(--text-secondary); font-size: .66rem; font-weight: 800; }

	.card-stack { display: grid; gap: .6rem; }
	.r-card { position: relative; display: grid; grid-template-columns: 48px 1fr auto; align-items: center; gap: 1rem; padding: .95rem 1rem; border: 1px solid var(--border-subtle); border-radius: 18px; background: var(--surface-panel); transition: all .2s ease; overflow: hidden; }
	.r-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--card-tone-ring); opacity: .8; }
	.r-card:hover { border-color: color-mix(in srgb, var(--card-tone-ring), var(--border-subtle) 50%); transform: translateY(-1px); box-shadow: 0 10px 26px rgb(0 0 0 / 6%); }
	.r-card.leaving { opacity: 0; transform: translateX(10px); }
	.icon-wrap { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; flex: 0 0 44px; }
	.r-copy { min-width: 0; display: grid; gap: .28rem; }
	.r-head { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; flex-wrap: wrap; }
	.r-title-row { display: inline-flex; align-items: center; gap: .5rem; flex-wrap: wrap; min-width: 0; }
	.r-title-row h3 { margin: 0; font-size: .9rem; font-weight: 750; letter-spacing: -.015em; line-height: 1.25; }
	.pill { padding: .12rem .5rem; border-radius: 999px; font-size: .58rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.pill.spaced   { color: #b45f06; background: color-mix(in srgb, var(--warning, #f6ad55), transparent 86%); }
	.pill.task     { color: var(--accent); background: var(--accent-soft); }
	.pill.deadline { color: var(--danger, #e0455a); background: color-mix(in srgb, var(--danger, #e0455a), transparent 88%); }
	.pill.nudge    { color: var(--success, #42b883); background: color-mix(in srgb, var(--success, #42b883), transparent 86%); }
	:global([data-theme='dark']) .pill.spaced, :global([data-theme='red']) .pill.spaced, :global([data-theme='green']) .pill.spaced, :global([data-theme='obsidian']) .pill.spaced, :global([data-theme='quizlet']) .pill.spaced { color: #f6ad55; }
	.when { display: inline-flex; align-items: center; gap: .32rem; font-size: .7rem; font-weight: 750; white-space: nowrap; }
	.r-blurb { margin: 0; color: var(--text-secondary); font-size: .78rem; line-height: 1.55; display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
	.r-blurb b { color: var(--text-primary); font-weight: 650; }
	.sdot { flex: 0 0 8px; width: 8px; height: 8px; border-radius: 999px; }

	.r-actions { display: inline-flex; align-items: center; gap: .25rem; position: relative; }
	.link { display: inline-flex; align-items: center; gap: .35rem; height: 32px; padding: 0 .6rem; border: 0; border-radius: 10px; background: transparent; color: var(--text-secondary); font-size: .72rem; font-weight: 720; cursor: pointer; font-family: inherit; transition: all .15s ease; }
	.link:hover { color: var(--accent); background: var(--accent-soft); }
	.link.dismiss:hover { color: var(--danger, #e0455a); background: color-mix(in srgb, var(--danger, #e0455a), transparent 90%); }
	.snooze-wrap { position: relative; }
	.snooze-pop { position: absolute; z-index: 10; right: 0; top: 100%; margin-top: 4px; display: grid; min-width: 120px; padding: .3rem; border: 1px solid var(--border-subtle); border-radius: 12px; background: var(--surface-panel); box-shadow: 0 14px 30px rgb(0 0 0 / 14%); }
	.snooze-pop button { display: flex; align-items: center; height: 32px; padding: 0 .7rem; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: .74rem; font-weight: 650; cursor: pointer; text-align: left; font-family: inherit; }
	.snooze-pop button:hover { color: var(--accent); background: var(--accent-soft); }

	/* -------- modal form -------- */
	.form { display: grid; gap: .85rem; }
	.kind-row { display: inline-flex; gap: .3rem; padding: .28rem; border: 1px solid var(--border-subtle); border-radius: 13px; background: var(--surface-subtle); }
	.kind-row button { display: inline-flex; align-items: center; gap: .38rem; height: 34px; padding: 0 .85rem; border: 0; border-radius: 10px; background: transparent; color: var(--text-secondary); font-size: .74rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.kind-row button.selected { color: var(--accent-contrast, #fff); background: var(--accent); box-shadow: 0 6px 14px color-mix(in srgb, var(--accent), transparent 68%); }
	.field { display: grid; gap: .3rem; }
	.field > small { color: var(--text-secondary); font-size: .64rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
	.field input, .field select, .field textarea {
		width: 100%; padding: .6rem .75rem; border: 1px solid var(--border-subtle); border-radius: 12px;
		background: var(--surface-subtle); color: var(--text-primary); font-size: .84rem; font-family: inherit;
	}
	.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--accent); background: var(--surface-panel); }
	.field textarea { resize: vertical; min-height: 62px; }
	.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }

	.ghost, .solid { display: inline-flex; align-items: center; gap: .4rem; height: 36px; padding: 0 .9rem; border-radius: 11px; font-size: .76rem; font-weight: 750; cursor: pointer; font-family: inherit; }
	.ghost { border: 1px solid var(--border-subtle); background: var(--surface-panel); color: var(--text-secondary); }
	.ghost:hover { color: var(--text-primary); border-color: var(--accent); }
	.solid { border: 0; background: var(--accent); color: var(--accent-contrast, #fff); box-shadow: 0 8px 18px color-mix(in srgb, var(--accent), transparent 65%); }
	.solid:disabled { opacity: .45; cursor: default; box-shadow: none; }

	@media (max-width: 768px) {
		.page-head { flex-direction: column; align-items: stretch; gap: 0.85rem; }
		.head-actions { width: 100%; display: flex; }
		.count-chip { flex: 1; justify-content: center; height: 42px; }
		.set-reminder { flex: 1; justify-content: center; height: 42px; }
		.r-card { grid-template-columns: 38px 1fr; touch-action: pan-y; }
		.r-card::before { width: 2.5px; }
		.icon-wrap { width: 38px; height: 38px; border-radius: 12px; flex: 0 0 38px; }
		.r-actions { grid-column: 1 / -1; justify-content: flex-end; padding-top: .4rem; border-top: 1px dashed var(--border-subtle); margin-top: .1rem; }
		.link { min-height: 38px; padding: 0 0.75rem; }
		.row-2 { grid-template-columns: 1fr; }
		.kind-row { display: flex; width: 100%; }
		.kind-row button { flex: 1; justify-content: center; height: 40px; font-size: 0.76rem; }
		.field input, .field select, .field textarea { min-height: 42px; font-size: 0.9rem; }
	}
</style>
