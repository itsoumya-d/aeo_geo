type Replacement = {
  pattern: RegExp;
  replace: string;
};

export const UI_TERMS = {
  productName: 'Cognition AI',
  analysisEngine: 'AI Analysis Engine',
  siteDiscovery: 'Site Discovery Engine',
  cloudProcessing: 'Cloud Processing',
} as const;

const REPLACEMENTS: Replacement[] = [
  // Model/version strings
  { pattern: /\bGemini\s*2\.0\s*Flash\b/gi, replace: UI_TERMS.analysisEngine },
  { pattern: /\bGemini\s*1\.5\s*Pro\b/gi, replace: UI_TERMS.analysisEngine },
  { pattern: /\bClaude\s*3(\.\d+)?(\s*\.?\s*\d+)?\s*Sonnet\b/gi, replace: UI_TERMS.analysisEngine },
  { pattern: /\bGPT-?4o\b/gi, replace: UI_TERMS.analysisEngine },
  { pattern: /\bOpenAI\b/gi, replace: UI_TERMS.analysisEngine },

  // Infra/vendor strings
  { pattern: /\bSupabase\b/gi, replace: UI_TERMS.cloudProcessing },
  { pattern: /\bEdge Functions?\b/gi, replace: UI_TERMS.cloudProcessing },
  { pattern: /\bFirecrawl\b/gi, replace: UI_TERMS.siteDiscovery },
  { pattern: /\bpgvector\b/gi, replace: 'semantic indexing' },
  { pattern: /\bPostgreSQL\b/gi, replace: UI_TERMS.cloudProcessing },

  // Overly technical jargon
  { pattern: /\bRAG\b/gi, replace: 'AI search' },
  { pattern: /\bvector(?:s)?\b/gi, replace: 'semantic' },
  { pattern: /\blatent\b/gi, replace: 'semantic' },
];

export function sanitizeUiCopy(text: string): string {
  let out = text;
  for (const r of REPLACEMENTS) out = out.replace(r.pattern, r.replace);
  return out;
}

