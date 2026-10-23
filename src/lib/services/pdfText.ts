import { browser } from '$app/environment';

/**
 * Extracts plain text from a PDF Blob or File using pdfjs-dist in the browser.
 * Reads up to maxPages to balance speed and memory usage.
 */
export async function extractTextFromPdfBlob(blob: Blob, maxPages = 20): Promise<string> {
	if (!browser) return '';
	try {
		const pdfjs = await import('pdfjs-dist');
		
		// Set worker if not already set
		if (!pdfjs.GlobalWorkerOptions.workerSrc) {
			try {
				const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
				pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
			} catch {
				pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '4.10.38'}/pdf.worker.min.mjs`;
			}
		}

		const data = await blob.arrayBuffer();
		const loadingTask = pdfjs.getDocument({
			data,
			isEvalSupported: false,
			useSystemFonts: true
		});

		// Timeout safeguard of 9 seconds
		const doc = await Promise.race([
			loadingTask.promise,
			new Promise<never>((_, reject) => setTimeout(() => reject(new Error('PDF extraction timed out')), 9000))
		]);

		let fullText = '';
		const pageCount = Math.min(doc.numPages, maxPages);

		for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
			const page = await doc.getPage(pageNum);
			const textContent = await page.getTextContent();
			let lastY: number | null = null;
			let pageText = '';

			for (const item of textContent.items as any[]) {
				const y = item.transform?.[5] ?? 0;
				if (lastY !== null && Math.abs(y - lastY) > 4) {
					pageText += '\n';
				} else if (pageText && !pageText.endsWith(' ') && !item.str.startsWith(' ')) {
					pageText += ' ';
				}
				pageText += item.str;
				lastY = y;
			}

			fullText += `--- Page ${pageNum} ---\n${pageText.trim()}\n\n`;
		}

		return fullText.trim();
	} catch (err) {
		console.warn('PDF text extraction error:', err);
		return '';
	}
}
