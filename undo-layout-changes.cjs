const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'LandingPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Undo Citations shrinkage
content = content.replace(
    '<div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3 min-w-0">',
    '<div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">'
);
content = content.replace(
    '<p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-muted truncate">{metric.label}</p>',
    '<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{metric.label}</p>'
);
content = content.replace(
    '<p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-display font-bold text-white truncate">{metric.value}</p>',
    '<p className="mt-2 text-2xl font-display font-bold text-white">{metric.value}</p>'
);
content = content.replace(
    '<p className="mt-1 text-[10px] sm:text-xs text-text-muted leading-tight truncate">{metric.note}</p>',
    '<p className="mt-1 text-xs text-text-muted">{metric.note}</p>'
);

// 2. Undo Widen container
content = content.replace(
    '<div className="max-w-[85rem] mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-18 sm:pb-24 relative">',
    '<div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-18 sm:pb-24 relative">'
);
content = content.replace(
    '<div className="relative z-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14 xl:gap-16 items-center">',
    '<div className="relative z-10 grid gap-12 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:gap-14 xl:gap-16 items-center">'
);

// 3. Undo Revert margins
content = content.replace(
    'className="relative z-10 w-full lg:max-w-[48rem] lg:ml-auto origin-left"',
    'className="relative z-10 w-full lg:w-[calc(100%+3rem)] xl:w-[calc(100%+7rem)] lg:-mr-12 xl:-mr-28 max-w-none origin-left"'
);

fs.writeFileSync(filePath, content);
console.log('Undid layout changes successfully.');
