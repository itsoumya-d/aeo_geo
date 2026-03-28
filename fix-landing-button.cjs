const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'LandingPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
    '<Button variant="ghost" className="w-full sm:w-auto border border-white/10">Email Support</Button>',
    '<Button variant="secondary" className="w-full sm:w-auto">Email Support</Button>'
);

fs.writeFileSync(filePath, content);
console.log('LandingPage updated.');
