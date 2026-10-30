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

export function sanitizeHtml(html: string): string {
    if (!html) return '';
    let clean = html;

    // 1. Remove dangerous tag blocks and elements
    clean = clean.replace(/<\s*(?:script|iframe|object|embed|form|meta|link)\b[\s\S]*?(?:<\/\s*(?:script|iframe|object|embed|form|meta|link)\s*>|\/?>)/gi, '');
    clean = clean.replace(/<\/\s*(?:script|iframe|object|embed|form|meta|link)\s*>/gi, '');

    // 2. Remove inline event handler attributes (e.g., onclick="...", onerror=...)
    clean = clean.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    // 3. Neutralize javascript: pseudo-protocol in href and src
    clean = clean.replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, ' $1="#"');
    clean = clean.replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, ' $1="#"');

    return clean;
}

export const renderMarkdown = async (text: string): Promise<string> => {
    if (!text) return '';
    const parsed = await marked.parse(preprocessMath(text));
    return sanitizeHtml(parsed as string);
};

export const renderMarkdownSync = (text: string): string => {
    if (!text) return '';
    const parsed = marked.parse(preprocessMath(text)) as string;
    return sanitizeHtml(parsed);
};

export { marked };
