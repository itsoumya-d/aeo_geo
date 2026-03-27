import React from 'react';
import { Helmet } from '@vuer-ai/react-helmet-async';

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

const SITE_NAME = 'GOAT AEO';
const DEFAULT_IMAGE = 'https://aeogeo-eight.vercel.app/og-image.png';
const BASE_URL = 'https://aeogeo-eight.vercel.app';

// Organization schema for brand recognition by AI
const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'GOAT AEO',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: 'GOAT AEO is an AI visibility engine for Generative Engine Optimization (GEO). Analyze how ChatGPT, Gemini, Claude, and Perplexity perceive your brand.',
    sameAs: [],
    contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'support@goataeo.com'
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
        'Citation Tracking',
        'Semantic Analysis',
        'Content Optimization'
    ]
};

// SoftwareApplication schema for AI/app store recognition
const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GOAT AEO Visibility Engine',
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
        'AI visibility reporting',
        'Multi-platform scoring (ChatGPT, Gemini, Claude, Perplexity)',
        'Actionable recommendations',
        'Rewrite simulation with measurable impact',
        'Keyword visibility tracking',
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
    description: 'GOAT AEO helps brands improve visibility in AI search engines like ChatGPT, Gemini, Claude, and Perplexity.',
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
    title = 'GOAT AEO | AI Visibility Engine',
    description = 'Discover how ChatGPT, Gemini, Claude, and Perplexity see your brand. GOAT AEO gives you real-time AI visibility scoring and recommendations.',
    keywords = ['AI SEO', 'GEO', 'AEO', 'Generative Engine Optimization', 'AI Visibility', 'ChatGPT SEO', 'Answer Engine Optimization'],
    image = DEFAULT_IMAGE,
    url = BASE_URL,
    type = 'website',
    faqs,
    noindex = false,
    publishedTime,
    modifiedTime,
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
            <link rel="dns-prefetch" href={BASE_URL} />

            {/* Primary Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords.join(', ')} />
            <meta name="author" content="GOAT AEO" />
            <link rel="canonical" href={canonicalUrl} />

            {/* AI Discoverability Meta Tags */}
            <meta name="generator" content="GOAT AEO Platform v2.0" />
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

            {/* Article timestamps — used when type="article" */}
            {publishedTime && <meta property="article:published_time" content={publishedTime} />}
            {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
            {(publishedTime || modifiedTime) && <meta property="article:author" content={SITE_NAME} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@goataeo" />
            <meta name="twitter:creator" content="@goataeo" />
            <meta name="twitter:url" content={canonicalUrl} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {/* Additional SEO */}
            <meta name="theme-color" content="#22d3ee" />
            <meta name="application-name" content={SITE_NAME} />
            <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
            <meta name="msapplication-TileColor" content="#22d3ee" />

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
