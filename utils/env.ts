/**
 * Environment variable validation
 *
 * Call `validateEnv()` at application startup.
 * In development it logs clear console errors for missing vars.
 * In production it silently returns the result so the app can render
 * an appropriate "misconfigured" screen rather than crashing.
 */

interface EnvVar {
    key: string;
    /** If true, the app cannot function without this var */
    required: boolean;
    description: string;
}

/** Frontend (VITE_*) vars that the client bundle needs */
const CLIENT_ENV_VARS: EnvVar[] = [
    {
        key: 'VITE_SUPABASE_URL',
        required: true,
        description: 'Supabase project URL (e.g. https://xyz.supabase.co)',
    },
    {
        key: 'VITE_SUPABASE_ANON_KEY',
        required: true,
        description: 'Supabase anonymous/public API key',
    },
    {
        key: 'VITE_PADDLE_CLIENT_TOKEN',
        required: false,
        description: 'Paddle v2 client token (billing will be disabled if absent)',
    },
    {
        key: 'VITE_PADDLE_ENVIRONMENT',
        required: false,
        description: '"sandbox" or "production" (defaults to "production")',
    },
];

export interface EnvValidationResult {
    /** All required vars are present */
    valid: boolean;
    /** Keys of missing required vars */
    missingRequired: string[];
    /** Keys of missing optional vars */
    missingOptional: string[];
}

export function validateEnv(): EnvValidationResult {
    const missingRequired: string[] = [];
    const missingOptional: string[] = [];

    for (const v of CLIENT_ENV_VARS) {
        const val = import.meta.env[v.key];
        const isMissing = !val || val === '' || val.startsWith('your_');

        if (isMissing) {
            if (v.required) {
                missingRequired.push(v.key);
            } else {
                missingOptional.push(v.key);
            }
        }
    }

    if (import.meta.env.DEV) {
        if (missingRequired.length > 0) {
            console.error(
                '[Cognition] ❌ Missing REQUIRED environment variables.\n' +
                'Copy .env.example to .env.local and fill in the values.\n\n' +
                missingRequired.map(k => {
                    const def = CLIENT_ENV_VARS.find(v => v.key === k)!;
                    return `  • ${k} — ${def.description}`;
                }).join('\n')
            );
        }
        if (missingOptional.length > 0) {
            console.warn(
                '[Cognition] ⚠️ Missing optional environment variables (some features may be disabled):\n' +
                missingOptional.map(k => {
                    const def = CLIENT_ENV_VARS.find(v => v.key === k)!;
                    return `  • ${k} — ${def.description}`;
                }).join('\n')
            );
        }
        if (missingRequired.length === 0 && missingOptional.length === 0) {
            console.info('[Cognition] ✅ All environment variables are configured.');
        }
    }

    return {
        valid: missingRequired.length === 0,
        missingRequired,
        missingOptional,
    };
}

/** Convenience getter — throws in dev if var is required but missing */
export function getEnv(key: string, fallback?: string): string {
    const val = import.meta.env[key] ?? fallback;
    if (val === undefined || val === '') {
        if (import.meta.env.DEV) {
            console.warn(`[Cognition] env var "${key}" is not set`);
        }
        return '';
    }
    return String(val);
}
