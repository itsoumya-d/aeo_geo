import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ReportTemplateEditor } from '../components/reports/ReportTemplateEditor';
import '../index.css';

function Demo() {
    const [failSave, setFailSave] = useState(false);
    const [savedName, setSavedName] = useState('');
    return <>
        <aside style={{ padding: '16px', background: '#eff6ff', color: '#0f172a' }} aria-label="Demo controls">
            <strong>Offline report template demo</strong>
            <p>No sign-in or API keys. Saves are simulated and cleared on reload. Export JSON to keep your layout. No audit, provider, or billing calls are made.</p>
            <label><input type="checkbox" checked={failSave} onChange={event => setFailSave(event.target.checked)} /> Simulate save failure</label>
            {savedName && <p>Last simulated save: {savedName}</p>}
        </aside>
        <ReportTemplateEditor
            onBack={() => { window.location.hash = 'demo'; }}
            onSave={async template => {
                if (failSave) throw new Error('Simulated failure');
                setSavedName(template.name);
            }}
        />
    </>;
}

createRoot(document.getElementById('root')!).render(<Demo />);
