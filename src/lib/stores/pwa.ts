import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface DeviceInfo {
	os: 'ios' | 'android' | 'mac' | 'windows' | 'linux';
	browserName: 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other';
	isIos: boolean;
	isAndroid: boolean;
	isMac: boolean;
	isWindows: boolean;
	isSafari: boolean;
	isChrome: boolean;
	isEdge: boolean;
	isStandalone: boolean;
}

export const pwaModalOpen = writable<boolean>(false);
export const pwaInstalled = writable<boolean>(false);
export const canNativeInstall = writable<boolean>(false);

let deferredInstallPrompt: any = null;

export function setDeferredPrompt(e: any) {
	deferredInstallPrompt = e;
	canNativeInstall.set(Boolean(e));
}

export function getDeferredPrompt() {
	return deferredInstallPrompt;
}

export async function triggerNativeInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
	if (!deferredInstallPrompt) return 'unavailable';
	try {
		deferredInstallPrompt.prompt();
		const choice = await deferredInstallPrompt.userChoice;
		deferredInstallPrompt = null;
		canNativeInstall.set(false);
		if (choice.outcome === 'accepted') {
			pwaInstalled.set(true);
			pwaModalOpen.set(false);
			return 'accepted';
		}
		return 'dismissed';
	} catch (err) {
		console.warn('Native PWA install error:', err);
		return 'unavailable';
	}
}

export function openPwaModal() {
	pwaModalOpen.set(true);
}

export function closePwaModal(dontAskAgain = false) {
	pwaModalOpen.set(false);
	if (browser) {
		try {
			if (dontAskAgain) {
				localStorage.setItem('btracker_pwa_opt_out', 'true');
			}
			localStorage.setItem('btracker_pwa_last_prompt', Date.now().toString());
		} catch {}
	}
}

export function detectDevice(): DeviceInfo {
	if (!browser) {
		return {
			os: 'mac',
			browserName: 'chrome',
			isIos: false,
			isAndroid: false,
			isMac: true,
			isWindows: false,
			isSafari: false,
			isChrome: true,
			isEdge: false,
			isStandalone: false
		};
	}

	const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
	const isStandalone =
		window.matchMedia('(display-mode: standalone)').matches ||
		Boolean((navigator as any)?.standalone) ||
		document.referrer.includes('android-app://');

	// OS detection
	const isIos = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isAndroid = /android/.test(ua);
	const isMac = !isIos && /macintosh|mac os x/.test(ua);
	const isWindows = /windows|win32|win64/.test(ua);
	const isLinux = !isAndroid && /linux/.test(ua);

	let os: DeviceInfo['os'] = 'windows';
	if (isIos) os = 'ios';
	else if (isAndroid) os = 'android';
	else if (isMac) os = 'mac';
	else if (isLinux) os = 'linux';

	// Browser detection
	const isEdge = /edg\//.test(ua);
	const isSamsung = /samsungbrowser/.test(ua);
	const isChrome = !isEdge && !isSamsung && /chrome|crios/.test(ua);
	const isFirefox = /firefox|fxios/.test(ua);
	const isSafari = !isChrome && !isEdge && !isSamsung && /safari/.test(ua);

	let browserName: DeviceInfo['browserName'] = 'other';
	if (isEdge) browserName = 'edge';
	else if (isSamsung) browserName = 'samsung';
	else if (isChrome) browserName = 'chrome';
	else if (isFirefox) browserName = 'firefox';
	else if (isSafari) browserName = 'safari';

	return {
		os,
		browserName,
		isIos,
		isAndroid,
		isMac,
		isWindows,
		isSafari,
		isChrome,
		isEdge,
		isStandalone
	};
}
