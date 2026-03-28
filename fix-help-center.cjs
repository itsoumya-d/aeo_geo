const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'HelpCenter.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const replacements = [
    { from: /text-white/g, to: 'text-text-primary' },
    { from: /text-slate-400/g, to: 'text-text-secondary' },
    { from: /text-slate-300/g, to: 'text-text-secondary' },
    { from: /text-slate-500/g, to: 'text-text-muted' },
    { from: /text-slate-600/g, to: 'text-text-muted' },
    { from: /bg-slate-900\/50/g, to: 'bg-surface shadow-sm' },
    { from: /bg-slate-800\/50/g, to: 'bg-surfaceHighlight' },
    { from: /bg-slate-800/g, to: 'bg-surface border border-border' },
    { from: /bg-slate-700/g, to: 'bg-surfaceHighlight' },
    { from: /border-slate-800/g, to: 'border-border' },
    { from: /border-slate-700/g, to: 'border-border' },
]

for (const rep of replacements) {
    content = content.replace(rep.from, rep.to);
}

fs.writeFileSync(filePath, content);
console.log('HelpCenter.tsx updated successfully.');
