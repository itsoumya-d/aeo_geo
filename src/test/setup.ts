import '@testing-library/jest-dom';

// Polyfill localStorage for environments that expose a stub without .clear()
if (typeof window !== 'undefined' && !window.localStorage?.clear) {
    const store: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
        value: {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, value: string) => { store[key] = String(value); },
            removeItem: (key: string) => { delete store[key]; },
            clear: () => { Object.keys(store).forEach(k => delete store[k]); },
            get length() { return Object.keys(store).length; },
            key: (i: number) => Object.keys(store)[i] ?? null,
        },
        writable: true,
    });
}
