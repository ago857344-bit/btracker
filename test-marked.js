import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';

marked.use(markedKatex({ throwOnError: false, nonStandard: true }));

let text = 'The terms are \\( \\mathbf{F}(x) = kx^2 \\hat{i} \\) and here is block: \\[\n y = mx+c \\]';
text = text.replace(/\\\((.*?)\\\)/gs, '$$$1$$');
text = text.replace(/\\\[(.*?)\\\]/gs, '\n\n$$$$\n$1\n$$$$\n\n');

const res = marked.parse(text);
console.log(res);
