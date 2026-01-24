export enum AssetType {
  WEBSITE = 'WEBSITE',
  YOUTUBE = 'YOUTUBE',
  TWITTER = 'TWITTER',
  LINKEDIN = 'LINKEDIN',
  DOCS = 'DOCS',
  BLOG = 'BLOG',
  OTHER = 'OTHER'
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  DISCOVERING = 'DISCOVERING', // finding pages
  CRAWLING = 'CRAWLING',       // "downloading" content
  ANALYZING = 'ANALYZING',     // LLM processing
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface Asset {
  id: string;
  type: AssetType;
  url: string;
  status: AnalysisStatus;
}

export interface DiscoveredPage {
  url: string;
  type: 'HOMEPAGE' | 'PRICING' | 'PRODUCT' | 'BLOG' | 'DOCS' | 'ABOUT' | 'LEGAL' | 'CONTACT' | 'FEATURES' | 'OTHER';
  status: 'PENDING' | 'CRAWLED' | 'ANALYZED' | 'ERROR';
}

export enum AIPlatform {
  CHATGPT = 'ChatGPT',
  GEMINI = 'Gemini',
  CLAUDE = 'Claude',
  PERPLEXITY = 'Perplexity'
}

export interface Project {
  id: string;
  domain: string;
  competitors: string[];
  target_keywords: string[];
  icon_url?: string;
}

export interface PlatformScore {
  platform: AIPlatform;
  score: number; // 0-100
  reasoning: string;
}

export interface Recommendation {
  id: string;
  pageUrl: string;
  issue: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'HIGH' | 'MEDIUM' | 'LOW';
  instruction: string; // "What EXACTLY to change"
  aiReasoning: string; // "Why it affects AI ranking"
  location: string; // "H1 tag", "First paragraph", "Meta description"
  snippet?: string; // Original snippet
  suggested?: string; // AI Suggested rewrite
  generatedSchema?: string; // Valid JSON-LD code block if applicable
}

export interface PageAnalysis {
  url: string;
  title: string;
  pageType: string;
  aiUnderstanding: string; // What AI thinks this page is
  aiMissed: string; // What AI missed
  quoteLikelihood: number; // 0-100
  recommendations: Recommendation[];
}

export interface SearchQuery {
  platform: AIPlatform;
  query: string;
  intent: string;
}

export interface SeoAudit {
  implemented: string[];
  missing: string[];
  technicalHealth: number; // 0-100
}

export interface Report {
  id?: string;
  overallScore: number;
  platformScores: PlatformScore[];
  pages: PageAnalysis[];
  brandConsistnecyScore: number; // 0-100
  consistencyAnalysis: string;
  topicalDominance: string[]; // List of topics the brand owns
  // New Fields
  searchQueries: SearchQuery[];
  seoAudit: SeoAudit;
  keywords: string[];
  keywordRankings?: {
    keyword: string;
    platform: AIPlatform;
    rank: number;
    citationFound: boolean;
  }[];
  vectorMap?: {
    x: number;
    y: number;
    label: string;
    type: 'brand' | 'competitor' | 'keyword';
  }[];
}