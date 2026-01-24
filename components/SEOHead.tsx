import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url?: string;
    type?: 'website' | 'article' | 'product';
    faqs?: Array<{ question: string; answer: string }>;
    noindex?: boolean;
    publishedTime?: string;
    modifiedTime?: string;
}

const SITE_NAME = 'Cognition AI';
const DEFAULT_IMAGE = 'https://cognition.ai/og-image.png';
const BASE_URL = 'https://cognition.ai';

// Organization schema for brand recognition by AI
const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Cognition AI',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: 'The market-leading AI Visibility Engine for Generative Engine Optimization (GEO). Analyze how ChatGPT, Gemini, Claude, and Perplexity perceive your brand.',
    sameAs: [
        'https://twitter.com/cognition_ai',
        'https://linkedin.com/company/cognition-ai',
        'https://github.com/cognition-ai'
    ],
    contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'support@cognition.ai'
    },
    foundingDate: '2024',
    numberOfEmployees: {
        '@type': 'QuantitativeValue',
        value: '10-50'
    },
    knowsAbout: [
        'Generative Engine Optimization',
        'AI SEO',
        'Answer Engine Optimization',
        'LLM Citation Tracking',
        'Vector Analysis',
        'Content Optimization'
    ]
};

// SoftwareApplication schema for AI/app store recognition
const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Cognition AI Visibility Engine',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
        '@type': 'AggregateOffer',
        lowPrice: '49',
        highPrice: '399',
        priceCurrency: 'USD',
        offerCount: '3'
    },
    aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '127'
    },
    featureList: [
        'Real-time AI perception analysis',
        'Multi-platform visibility scoring (ChatGPT, Gemini, Claude, Perplexity)',
        'Vector-based content optimization',
        'Rewrite simulation with semantic shift analysis',
        'Scheduled monitoring (Sentinel)',
        'Citation tracking and verification'
    ],
    screenshot: `${BASE_URL}/screenshots/dashboard.png`,
    softwareVersion: '2.0',
    creator: organizationSchema
};

// WebSite schema with SearchAction for sitelinks
const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    description: 'Cognition AI is the leading Generative Engine Optimization (GEO) platform helping brands improve visibility in AI search engines like ChatGPT, Gemini, Claude, and Perplexity.',
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
    },
    publisher: organizationSchema
};

export const SEOHead: React.FC<SEOHeadProps> = ({
    title = 'Cognition AI | AI Visibility Engine',
    description = 'Discover how ChatGPT, Gemini, Claude, and Perplexity see your brand. The market-leading Generative Engine Optimization (GEO) platform with real-time crawling and vector analysis.',
    keywords = ['AI SEO', 'GEO', 'AEO', 'Generative Engine Optimization', 'AI Visibility', 'ChatGPT SEO', 'Answer Engine Optimization'],
    image = DEFAULT_IMAGE,
    url = BASE_URL,
    type = 'website',
    faqs,
    noindex = false
}) => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const canonicalUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

    // Generate FAQPage schema if FAQs provided
    const faqSchema = faqs && faqs.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
            }
        }))
    } : null;

    return (
        <Helmet>
            {/* Preconnect hints for performance */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="dns-prefetch" href="https://api.cognition.ai" />

            {/* Primary Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords.join(', ')} />
            <meta name="author" content="Cognition AI" />
            <link rel="canonical" href={canonicalUrl} />

            {/* AI Discoverability Meta Tags */}
            <meta name="generator" content="Cognition AI Platform v2.0" />
            <meta name="subject" content="Generative Engine Optimization (GEO) and AI SEO" />
            <meta name="topic" content="AI Visibility, GEO, Answer Engine Optimization" />
            <meta name="summary" content={description} />
            <meta name="classification" content="Business/Marketing/SEO Tools" />
            <meta name="category" content="Software as a Service (SaaS)" />
            <meta name="coverage" content="Worldwide" />
            <meta name="distribution" content="Global" />

            {/* Robots */}
            {noindex ? (
                <meta name="robots" content="noindex, nofollow" />
            ) : (
                <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
            )}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:locale" content="en_US" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@cognition_ai" />
            <meta name="twitter:creator" content="@cognition_ai" />
            <meta name="twitter:url" content={canonicalUrl} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {/* Additional SEO */}
            <meta name="theme-color" content="#1E40AF" />
            <meta name="application-name" content={SITE_NAME} />
            <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
            <meta name="msapplication-TileColor" content="#1E40AF" />

            {/* Organization Schema */}
            <script type="application/ld+json">
                {JSON.stringify(organizationSchema)}
            </script>

            {/* SoftwareApplication Schema */}
            <script type="application/ld+json">
                {JSON.stringify(softwareApplicationSchema)}
            </script>

            {/* WebSite Schema with SearchAction */}
            <script type="application/ld+json">
                {JSON.stringify(websiteSchema)}
            </script>

            {/* FAQ Schema (if provided) */}
            {faqSchema && (
                <script type="application/ld+json">
                    {JSON.stringify(faqSchema)}
                </script>
            )}
        </Helmet>
    );
};
