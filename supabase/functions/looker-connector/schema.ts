// Looker Studio Community Connector Schema Definitions
// Defines data structure for each endpoint conforming to Looker Studio format

export const CONNECTOR_SCHEMA = {
    audits: {
        dimensions: [
            {
                name: 'domain',
                type: 'TEXT',
                label: 'Domain',
                description: 'Website domain being audited'
            },
            {
                name: 'platform',
                type: 'TEXT',
                label: 'AI Platform',
                description: 'AI search engine platform (ChatGPT, Gemini, Claude, etc.)'
            },
            {
                name: 'created_at',
                type: 'YEAR_MONTH_DAY',
                label: 'Audit Date',
                description: 'Date when the audit was performed'
            },
            {
                name: 'status',
                type: 'TEXT',
                label: 'Status',
                description: 'Audit status (completed, failed, pending)'
            }
        ],
        metrics: [
            {
                name: 'overall_score',
                type: 'NUMBER',
                label: 'Visibility Score',
                description: 'AI visibility score (0-100)',
                aggregation: 'AVG',
                defaultAggregation: 'AVG'
            },
            {
                name: 'quote_likelihood',
                type: 'NUMBER',
                label: 'Quote Likelihood',
                description: 'Probability of being quoted (0-100)',
                aggregation: 'AVG',
                defaultAggregation: 'AVG'
            },
            {
                name: 'citations_found',
                type: 'NUMBER',
                label: 'Citations Found',
                description: 'Number of citations detected',
                aggregation: 'SUM',
                defaultAggregation: 'SUM'
            },
            {
                name: 'audit_count',
                type: 'NUMBER',
                label: 'Audit Count',
                description: 'Total number of audits',
                aggregation: 'COUNT',
                defaultAggregation: 'COUNT'
            }
        ]
    },

    trends: {
        dimensions: [
            {
                name: 'date',
                type: 'YEAR_MONTH_DAY',
                label: 'Date',
                description: 'Date of the data point'
            },
            {
                name: 'platform',
                type: 'TEXT',
                label: 'AI Platform',
                description: 'AI search engine platform'
            },
            {
                name: 'domain',
                type: 'TEXT',
                label: 'Domain',
                description: 'Website domain'
            }
        ],
        metrics: [
            {
                name: 'score',
                type: 'NUMBER',
                label: 'Visibility Score',
                description: 'Your visibility score for this date',
                aggregation: 'AVG',
                defaultAggregation: 'AVG'
            },
            {
                name: 'competitor_avg_score',
                type: 'NUMBER',
                label: 'Competitor Avg Score',
                description: 'Average competitor visibility score',
                aggregation: 'AVG',
                defaultAggregation: 'AVG'
            },
            {
                name: 'delta',
                type: 'NUMBER',
                label: 'Score Delta',
                description: 'Difference from competitor average',
                aggregation: 'AVG',
                defaultAggregation: 'AVG'
            }
        ]
    },

    competitors: {
        dimensions: [
            {
                name: 'competitor_domain',
                type: 'TEXT',
                label: 'Competitor Domain',
                description: 'Competitor website domain'
            },
            {
                name: 'platform',
                type: 'TEXT',
                label: 'AI Platform',
                description: 'AI search engine platform'
            },
            {
                name: 'captured_at',
                type: 'YEAR_MONTH_DAY',
                label: 'Captured Date',
                description: 'Date when competitor data was captured'
            }
        ],
        metrics: [
            {
                name: 'score',
                type: 'NUMBER',
                label: 'Competitor Score',
                description: 'Competitor visibility score (0-100)',
                aggregation: 'AVG',
                defaultAggregation: 'AVG'
            },
            {
                name: 'keywords_tracked',
                type: 'NUMBER',
                label: 'Keywords Tracked',
                description: 'Number of keywords tracked for this competitor',
                aggregation: 'SUM',
                defaultAggregation: 'SUM'
            },
            {
                name: 'citations_found',
                type: 'NUMBER',
                label: 'Citations Found',
                description: 'Number of citations detected for competitor',
                aggregation: 'SUM',
                defaultAggregation: 'SUM'
            }
        ]
    },

    recommendations: {
        dimensions: [
            {
                name: 'page_url',
                type: 'TEXT',
                label: 'Page URL',
                description: 'URL of the page with recommendations'
            },
            {
                name: 'impact',
                type: 'TEXT',
                label: 'Impact Level',
                description: 'Recommendation impact (high, medium, low)'
            },
            {
                name: 'effort',
                type: 'TEXT',
                label: 'Effort Required',
                description: 'Implementation effort (high, medium, low)'
            },
            {
                name: 'status',
                type: 'TEXT',
                label: 'Status',
                description: 'Recommendation status (pending, in_progress, completed)'
            },
            {
                name: 'recommendation',
                type: 'TEXT',
                label: 'Recommendation Text',
                description: 'Full recommendation description'
            },
            {
                name: 'captured_at',
                type: 'YEAR_MONTH_DAY',
                label: 'Captured Date',
                description: 'Date when recommendation was generated'
            }
        ],
        metrics: [
            {
                name: 'quote_likelihood',
                type: 'NUMBER',
                label: 'Quote Likelihood',
                description: 'Page quote likelihood score',
                aggregation: 'AVG',
                defaultAggregation: 'AVG'
            },
            {
                name: 'count',
                type: 'NUMBER',
                label: 'Recommendation Count',
                description: 'Total number of recommendations',
                aggregation: 'COUNT',
                defaultAggregation: 'COUNT'
            }
        ]
    }
};

// Export type definitions for TypeScript
export type ConnectorEndpoint = keyof typeof CONNECTOR_SCHEMA;

export interface DimensionField {
    name: string;
    type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'YEAR_MONTH_DAY' | 'YEAR_MONTH_DAY_HOUR';
    label: string;
    description: string;
}

export interface MetricField {
    name: string;
    type: 'NUMBER';
    label: string;
    description: string;
    aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
    defaultAggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
}

export interface EndpointSchema {
    dimensions: DimensionField[];
    metrics: MetricField[];
}

// Helper function to get schema for an endpoint
export function getSchemaForEndpoint(endpoint: string): EndpointSchema | null {
    return CONNECTOR_SCHEMA[endpoint as ConnectorEndpoint] || null;
}

// Helper function to validate field names
export function isValidField(endpoint: string, fieldName: string): boolean {
    const schema = getSchemaForEndpoint(endpoint);
    if (!schema) return false;

    const allFields = [
        ...schema.dimensions.map(d => d.name),
        ...schema.metrics.map(m => m.name)
    ];

    return allFields.includes(fieldName);
}

// Helper function to get field metadata
export function getFieldMetadata(endpoint: string, fieldName: string): DimensionField | MetricField | null {
    const schema = getSchemaForEndpoint(endpoint);
    if (!schema) return null;

    const dimension = schema.dimensions.find(d => d.name === fieldName);
    if (dimension) return dimension;

    const metric = schema.metrics.find(m => m.name === fieldName);
    if (metric) return metric;

    return null;
}
