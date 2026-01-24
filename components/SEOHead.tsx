import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
    url?: string;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
    title = 'Cognition AI | AI Visibility Engine',
    description = 'Discover how AI search engines see your brand. Optimize for ChatGPT, Gemini, and Claude with Cognition.',
    keywords = ['AI SEO', 'AEO', 'Generative Engine Optimization', 'Brand Visibility'],
    image = 'https://cognition.ai/og-image.png',
    url = 'https://cognition.ai'
}) => {
    const siteTitle = title.includes('Cognition') ? title : `${title} | Cognition AI`;

    return (
        <Helmet>
            <title>{siteTitle}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords.join(', ')} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={siteTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={siteTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />
        </Helmet>
    );
};
