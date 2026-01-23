/**
 * Shared types for Supabase Edge Functions
 */

// Action types for the analyze-content function
export type ActionType = 'DISCOVER' | 'ANALYZE' | 'REWRITE' | 'CHECK_VISIBILITY' | 'SANDBOX_COMPARE' | 'AUTO_AUDIT';

// Request payload types
export interface DiscoverPayload {
    url: string;
}

export interface AnalyzePayload {
    websiteUrl: string;
    otherAssets?: string;
    mainContent?: string;
}

export interface RewritePayload {
    original: string;
    context: string;
    rewrite?: string;
    goal?: 'SNIPPET' | 'AUTHORITY' | 'CLARITY' | 'CONVERSION';
    tone?: 'PROFESSIONAL' | 'AUTHORITATIVE' | 'CONVERSATIONAL' | 'TECHNICAL';
}

export interface SandboxComparePayload {
    goal: string;
    variantA: string;
    variantB: string;
}

export interface VisibilityPayload {
    query: string;
    domain: string;
}

export interface AutoAuditPayload {
    domainUrl: string;
    organizationId: string;
    frequency: 'daily' | 'weekly' | 'monthly';
}

export type ActionPayload = DiscoverPayload | AnalyzePayload | RewritePayload | VisibilityPayload | SandboxComparePayload | AutoAuditPayload;

// Request body structure
export interface FunctionRequest {
    action: ActionType;
    payload: ActionPayload;
}

// Response types
export interface DiscoveredPage {
    url: string;
    type: 'HOMEPAGE' | 'PRICING' | 'PRODUCT' | 'BLOG' | 'DOCS' | 'ABOUT' | 'LEGAL' | 'OTHER';
    status: 'PENDING' | 'CRAWLED' | 'ANALYZED' | 'ERROR';
}

export interface PlatformScore {
    platform: string;
    score: number;
    reasoning: string;
}

export interface Recommendation {
    id: string;
    pageUrl: string;
    issue: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    effort: 'HIGH' | 'MEDIUM' | 'LOW';
    instruction: string;
    aiReasoning: string;
    location: string;
    snippet?: string;
    suggested?: string;
    generatedSchema?: string;
}

export interface PageAnalysis {
    url: string;
    title: string;
    pageType: string;
    aiUnderstanding: string;
    aiMissed: string;
    quoteLikelihood: number;
    recommendations: Recommendation[];
}

export interface SearchQuery {
    platform: string;
    query: string;
    intent: string;
}

export interface SeoAudit {
    implemented: string[];
    missing: string[];
    technicalHealth: number;
}

export interface VectorMapPoint {
    x: number;
    y: number;
    label: string;
    type: 'brand' | 'competitor' | 'keyword';
}

export interface AnalysisReport {
    overallScore: number;
    platformScores: PlatformScore[];
    pages: PageAnalysis[];
    brandConsistnecyScore: number;
    consistencyAnalysis: string;
    topicalDominance: string[];
    searchQueries: SearchQuery[];
    seoAudit: SeoAudit;
    keywords: string[];
    vectorMap?: VectorMapPoint[];
}

export interface RewriteResult {
    rewrite?: string;
    reasoning: string;
    scoreDelta: number;
    vectorShift: number;
}

export interface VisibilityResult {
    platform: string;
    rank: number;
    citationFound: boolean;
    sentiment: number;
    answer?: string;
    error?: string;
}

export interface SandboxCandidateResult {
    score: number;
    reasoning: string;
    platformScores: { platform: string; score: number }[];
    alignment: number;
}

export interface SandboxCompareResult {
    a: SandboxCandidateResult;
    b: SandboxCandidateResult;
}

// Credit result from RPC
export interface CreditResult {
    success: boolean;
    error?: string;
    remaining_audits?: number;
    remaining_rewrites?: number;
}

// User data from database
export interface UserData {
    organization_id: string | null;
}
