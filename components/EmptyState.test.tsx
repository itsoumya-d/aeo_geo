import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState Component', () => {
    it('renders title and description correctly', () => {
        render(
            <EmptyState
                title="No Data Found"
                description="Please try adjusting your filters."
            />
        );

        expect(screen.getByText('No Data Found')).toBeInTheDocument();
        expect(screen.getByText('Please try adjusting your filters.')).toBeInTheDocument();
    });

    it('renders action button and handles click', () => {
        const handleClick = vi.fn();
        render(
            <EmptyState
                title="Action Needed"
                action={{ label: 'Retry', onClick: handleClick }}
            />
        );

        const button = screen.getByText('Retry');
        expect(button).toBeInTheDocument();

        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
