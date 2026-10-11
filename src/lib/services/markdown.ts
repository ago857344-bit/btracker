import { marked } from 'marked';
// @ts-ignore
import markedKatex from 'marked-katex-extension';

// Configure marked with KaTeX for LaTeX rendering
marked.use(markedKatex({
    throwOnError: false,
    nonStandard: true
}));

export function preprocessMath(text: string): string {
    if (!text) return '';
    let processed = text;
    
    // Replace double-escaped block math: \\[ ... \\] -> $$ ... $$
    processed = processed.replace(/\\\\\[([\s\S]*?)\\\\\]/g, '\n\n$$$$\n$1\n$$$$\n\n');
    
    // Replace single-escaped block math: \[ ... \] -> $$ ... $$
    processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '\n\n$$$$\n$1\n$$$$\n\n');
    
    // Replace double-escaped inline math: \\( ... \\) -> $ ... $
    processed = processed.replace(/\\\\\(([\s\S]*?)\\\\\)/g, '$$$1$$');
    
    // Replace single-escaped inline math: \( ... \) -> $ ... $
    processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

    // Fix escaped underscores inside math tags: $\int\_0^\pi$ -> $\int_0^\pi$
    processed = processed.replace(/\$([^$]+)\$/g, (_, math) => `$${math.replace(/\\_/g, '_')}$`);

    return processed;
}

export const renderMarkdown = async (text: string) => {
    if (!text) return '';
    return await marked.parse(preprocessMath(text));
};

export const renderMarkdownSync = (text: string): string => {
    if (!text) return '';
    return marked.parse(preprocessMath(text)) as string;
};

export { marked };
