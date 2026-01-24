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
    }
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
            {/* Primary Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords.join(', ')} />
            <meta name="author" content="Cognition AI" />
            <link rel="canonical" href={canonicalUrl} />

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

            {/* Organization Schema */}
            <script type="application/ld+json">
                {JSON.stringify(organizationSchema)}
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
