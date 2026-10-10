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
    let processed = text;
    
    // Replace double-escaped block math: \\[ ... \\] -> $$ ... $$
    processed = processed.replace(/\\\\\[(.*?)\\\\\]/gs, '\n\n$$$$\n$1\n$$$$\n\n');
    
    // Replace single-escaped block math: \[ ... \] -> $$ ... $$
    processed = processed.replace(/\\\[(.*?)\\\]/gs, '\n\n$$$$\n$1\n$$$$\n\n');
    
    // Replace double-escaped inline math: \\( ... \\) -> $ ... $
    processed = processed.replace(/\\\\\((.*?)\\\\\)/gs, '$$$1$$');
    
    // Replace single-escaped inline math: \( ... \) -> $ ... $
    processed = processed.replace(/\\\((.*?)\\\)/gs, '$$$1$$');

    return await marked.parse(processed);
};

export { marked };
