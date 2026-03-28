const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'LandingPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Fix Citations overflow again
content = content.replace(
    '<div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">',
    '<div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3 min-w-0">'
);
content = content.replace(
    '<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{metric.label}</p>',
    '<p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-muted truncate">{metric.label}</p>'
);
content = content.replace(
    '<p className="mt-2 text-2xl font-display font-bold text-white">{metric.value}</p>',
    '<p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-display font-bold text-white truncate">{metric.value}</p>'
);
content = content.replace(
    '<p className="mt-1 text-xs text-text-muted">{metric.note}</p>',
    '<p className="mt-1 text-[10px] sm:text-xs text-text-muted leading-tight truncate">{metric.note}</p>'
);

// 2. Make the HeroPreview card BLEED completely off the right edge of the screen
content = content.replace(
    'className="relative z-10 w-full lg:w-[calc(100%+3rem)] xl:w-[calc(100%+7rem)] lg:-mr-12 xl:-mr-28 max-w-none origin-left"',
    'className="relative z-10 w-full lg:w-[150vw] max-w-none origin-left"'
);

fs.writeFileSync(filePath, content);
console.log('Fixed edge gap and text overflow.');
