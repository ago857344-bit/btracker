import { marked } from 'marked';
// @ts-ignore
import markedKatex from 'marked-katex-extension';

// Configure marked with KaTeX for LaTeX rendering
marked.use(markedKatex({
    throwOnError: false,
    nonStandard: true
}));

export const renderMarkdown = async (text: string) => {
    if (!text) return '';
    // Convert inline Gemini math \( ... \) to standard $ ... $
    let processed = text.replace(/\\\((.*?)\\\)/gs, '$$$1$$');
    // Convert block Gemini math \[ ... \] to standard $$ ... $$
    processed = processed.replace(/\\\[(.*?)\\\]/gs, '\n\n$$$$\n$1\n$$$$\n\n');
    return await marked.parse(processed);
};

export { marked };
