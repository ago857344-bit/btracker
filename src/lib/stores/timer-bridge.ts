/**
 * Leaf module (no imports) that breaks the tracker ↔ timerState ↔ recall-actions
 * import cycle. Both directions are registered lazily at runtime, so module
 * evaluation order can't observe uninitialised store bindings during SSR.
 */
type SessionBoostHandler = (sub: string, ch: string, duration: number) => void;
type RolloverProbe = () => boolean;

let boostHandler: SessionBoostHandler | null = null;
let rolloverProbe: RolloverProbe | null = null;

export function setSessionBoostHandler(fn: SessionBoostHandler | null): void {
	boostHandler = fn;
}

export function applySessionBoost(sub: string, ch: string, duration: number): void {
	boostHandler?.(sub, ch, duration);
}

export function setRolloverBlockProbe(fn: RolloverProbe | null): void {
	rolloverProbe = fn;
}

/** True when an active/partial focus session must keep the midnight rollover from running. */
export function isRolloverBlocked(): boolean {
	return rolloverProbe?.() ?? false;
}
