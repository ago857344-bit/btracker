import { writable } from 'svelte/store';

/** Live width in px while the user drags the sidebar edge; null when idle. */
export const sidebarDragWidth = writable<number | null>(null);

/** Only expose the drag handle on the sidebar edge while the user is editing its size. */
export const sidebarResizeMode = writable<boolean>(false);
