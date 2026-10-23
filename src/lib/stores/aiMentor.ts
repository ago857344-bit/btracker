import { writable } from 'svelte/store';

export interface DocumentContext {
	fileName: string;
	subject: string;
	text: string;
	pageCount?: number;
	status?: 'extracting' | 'ready';
}

export interface AiMentorRequest {
	id: string;
	initialMessage?: string;
	prompt?: string;
	typingStatus?: string;
	doc?: DocumentContext;
	textPromise?: Promise<string>;
	autoSend?: boolean;
	timestamp: number;
}

export interface FlowLineEvent {
	fromX: number;
	fromY: number;
	toX: number;
	toY: number;
	emoji?: string;
	label?: string;
	id: string;
}

export const aiMentorRequest = writable<AiMentorRequest | null>(null);
export const aiOrbFlowEvent = writable<FlowLineEvent | null>(null);

// Backward-compatibility aliases
export const flyingSparkEvent = aiOrbFlowEvent;
export type FlyingSparkEvent = FlowLineEvent;

export function triggerOrbFlow(fromEl: HTMLElement | { x: number; y: number }, emoji = '✨', label = ''): void {
	if (typeof window === 'undefined') return;
	let fromX = window.innerWidth / 2;
	let fromY = window.innerHeight / 2;

	if (fromEl && 'getBoundingClientRect' in fromEl && typeof (fromEl as HTMLElement).getBoundingClientRect === 'function') {
		const r = (fromEl as HTMLElement).getBoundingClientRect();
		fromX = r.left + r.width / 2;
		fromY = r.top + r.height / 2;
	} else if (fromEl && typeof (fromEl as any).x === 'number' && typeof (fromEl as any).y === 'number') {
		fromX = (fromEl as any).x;
		fromY = (fromEl as any).y;
	}

	const orbEl = document.querySelector('.mentor-wrapper .orb');
	let toX = window.innerWidth - 46;
	let toY = window.innerHeight - 46;

	if (orbEl) {
		const r = orbEl.getBoundingClientRect();
		toX = r.left + r.width / 2;
		toY = r.top + r.height / 2;
	}

	aiOrbFlowEvent.set({
		id: `flow_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
		fromX,
		fromY,
		toX,
		toY,
		emoji,
		label
	});
}

export const triggerOrbFlight = triggerOrbFlow;

export function sendToAiMentor(req: Omit<AiMentorRequest, 'id' | 'timestamp'>): void {
	aiMentorRequest.set({
		...req,
		id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		timestamp: Date.now()
	});
}
