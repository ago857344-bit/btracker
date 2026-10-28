import { browser } from '$app/environment';
import type { CustomReminder } from '$lib/types/tracker';

/**
 * Request permission from the user for desktop/mobile notifications.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
	if (!browser || !('Notification' in window)) {
		return 'denied';
	}
	try {
		return await Notification.requestPermission();
	} catch {
		return 'denied';
	}
}

/**
 * Check if notifications are currently permitted.
 */
export function hasNotificationPermission(): boolean {
	if (!browser || !('Notification' in window)) return false;
	return Notification.permission === 'granted';
}

/**
 * Send an immediate browser notification via Service Worker (mobile PWA) or Notification API (desktop).
 */
export async function notifyUser(title: string, options?: NotificationOptions): Promise<void> {
	if (!browser || !('Notification' in window)) return;
	if (Notification.permission !== 'granted') return;

	const defaultOptions: NotificationOptions & { vibrate?: number[] } = {
		icon: '/favicon.png',
		badge: '/favicon.png',
		vibrate: [200, 100, 200],
		...options
	};

	try {
		if ('serviceWorker' in navigator) {
			const registration = await navigator.serviceWorker.ready;
			if (registration && 'showNotification' in registration) {
				await registration.showNotification(title, defaultOptions as any);
				return;
			}
		}
		new Notification(title, defaultOptions as NotificationOptions);
	} catch (e) {
		console.warn('Browser notification failed:', e);
	}
}

const notifiedReminderIds = new Set<string>();

/**
 * Periodic evaluator for custom and snoozed reminders that have become due.
 */
export function checkDueReminders(
	reminders: CustomReminder[] | undefined,
	onTrigger?: (reminder: CustomReminder) => void
): void {
	if (!browser || !reminders || !reminders.length) return;
	const now = Date.now();

	for (const reminder of reminders) {
		if (reminder.dismissed) continue;
		if (notifiedReminderIds.has(reminder.id)) continue;

		let dueEpoch = 0;
		if (reminder.when.includes('T')) {
			dueEpoch = new Date(reminder.when).getTime();
		} else {
			// Date only (YYYY-MM-DD): treat as 9:00 AM on that date
			dueEpoch = new Date(`${reminder.when}T09:00:00`).getTime();
		}

		if (!isNaN(dueEpoch) && now >= dueEpoch && now - dueEpoch < 24 * 60 * 60 * 1000) {
			notifiedReminderIds.add(reminder.id);
			notifyUser(`⏰ Reminder: ${reminder.title}`, {
				body: reminder.blurb || 'Scheduled BTracker reminder is due now.',
				tag: `reminder-${reminder.id}`
			});
			onTrigger?.(reminder);
		}
	}
}
