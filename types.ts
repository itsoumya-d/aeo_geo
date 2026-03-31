export interface VectorMapPoint {
  x: number;
  y: number;
  z: number;
  label: string;
  type: 'brand' | 'competitor' | 'keyword' | 'your_content' | 'gold_standard' | 'optimization_target';
}

export enum AssetType {
  WEBSITE = 'WEBSITE',
  YOUTUBE = 'YOUTUBE',
  TWITTER = 'TWITTER',
  LINKEDIN = 'LINKEDIN',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
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
  PERPLEXITY = 'Perplexity',
  GOOGLE_AI_OVERVIEWS = 'Google AI Overviews',
  MICROSOFT_COPILOT = 'Microsoft Copilot',
  META_AI = 'Meta AI',
  GROK = 'Grok',
  DEEPSEEK = 'DeepSeek'
}

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  icon_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  added_at: string;
  added_by?: string;
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
  status?: 'OPEN' | 'DONE' | 'IGNORED';
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

export interface SocialPlatformResult {
  platform: 'Twitter/X' | 'LinkedIn' | 'YouTube' | 'Instagram' | 'Facebook';
  url: string;
  present: boolean;
  activityScore: number; // 0-100
  brandConsistency: number; // 0-100
  bio?: string;
  issues?: string[];
}

export interface SocialAnalysis {
  overallPresenceScore: number; // 0-100
  activityScore: number; // 0-100
  brandConsistencyScore: number; // 0-100
  platforms: SocialPlatformResult[];
  platformCoverage: number; // % of major platforms active (0-100)
  keyMismatches: string[];
  recommendations: string[];
}

export interface GBPAnalysis {
  businessName: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  hours?: Record<string, string>;
  photosCount: number;
  sentimentSummary: string;
  napConsistencyScore: number; // 0-100
  overallScore: number; // 0-100
  issues: string[];
  recommendations: string[];
}

export interface Report {
  id?: string;
  createdAt?: string;
  overallScore: number;
  platformScores: PlatformScore[];
  pages: PageAnalysis[];
  brandConsistencyScore: number; // 0-100
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
  vectorMap?: VectorMapPoint[];
  socialAnalysis?: SocialAnalysis;
  gbpAnalysis?: GBPAnalysis;
  communitySignal?: {
    sentiment: 'Positive' | 'Mixed' | 'Negative';
    themes: string[];
    recommendation: string;
  };
}