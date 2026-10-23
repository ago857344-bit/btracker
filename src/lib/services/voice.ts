import { browser } from '$app/environment';

export interface VoiceDictationOptions {
	onStart?: () => void;
	onInterim?: (fullText: string) => void;
	onResult?: (finalText: string) => void;
	onError?: (errorMessage: string) => void;
	onEnd?: () => void;
	lang?: string;
	continuous?: boolean;
}

export class VoiceDictation {
	private recognition: any = null;
	private active = false;
	private baseText = '';
	private sessionFinalText = '';

	static isSupported(): boolean {
		if (!browser) return false;
		return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
	}

	async start(options: VoiceDictationOptions, initialText = ''): Promise<boolean> {
		if (!browser) return false;
		if (!VoiceDictation.isSupported()) {
			options.onError?.('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
			options.onEnd?.();
			return false;
		}

		// Stop any currently running instance
		this.stop();

		const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

		try {
			const rec = new SpeechRec();
			this.recognition = rec;
			this.baseText = initialText.trim();
			this.sessionFinalText = '';
			this.active = true;

			rec.continuous = options.continuous ?? true;
			rec.interimResults = true;
			rec.lang = options.lang || 'en-US';

			rec.onstart = () => {
				this.active = true;
				options.onStart?.();
			};

			rec.onresult = (event: any) => {
				let interim = '';
				for (let i = event.resultIndex; i < event.results.length; ++i) {
					const item = event.results[i];
					if (item.isFinal) {
						const chunk = item[0].transcript.trim();
						if (chunk) {
							this.sessionFinalText += (this.sessionFinalText ? ' ' : '') + chunk;
						}
					} else {
						const chunk = item[0].transcript.trim();
						if (chunk) {
							interim += (interim ? ' ' : '') + chunk;
						}
					}
				}

				const accumulatedFinal = this.baseText
					? (this.sessionFinalText ? `${this.baseText} ${this.sessionFinalText}` : this.baseText)
					: this.sessionFinalText;

				const displayText = interim
					? (accumulatedFinal ? `${accumulatedFinal} ${interim}` : interim)
					: accumulatedFinal;

				options.onInterim?.(displayText);
				if (this.sessionFinalText) {
					options.onResult?.(accumulatedFinal);
				}
			};

			rec.onerror = (event: any) => {
				console.warn('SpeechRecognition error:', event.error);
				this.active = false;
				if (event.error === 'no-speech') {
					// Benign pause in continuous mode, don't abort or notify
					return;
				}
				if (event.error === 'not-allowed') {
					options.onError?.('Microphone permission blocked. Please enable microphone access in your browser.');
				} else if (event.error === 'network') {
					options.onError?.('Network error occurred during voice recognition.');
				} else if (event.error !== 'aborted') {
					options.onError?.(`Voice error: ${event.error}`);
				}
				options.onEnd?.();
			};

			rec.onend = () => {
				this.active = false;
				options.onEnd?.();
			};

			rec.start();
			return true;
		} catch (e: any) {
			console.error('Failed to start SpeechRecognition:', e);
			options.onError?.('Failed to start voice dictation. Please try again.');
			this.active = false;
			options.onEnd?.();
			return false;
		}
	}

	stop(): void {
		if (this.recognition) {
			try {
				this.recognition.abort();
			} catch {}
			this.recognition = null;
		}
		this.active = false;
	}

	isActive(): boolean {
		return this.active;
	}
}
