import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
    it('renders children correctly', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('handles click events', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click Me</Button>);

        fireEvent.click(screen.getByText('Click Me'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies primary variant by default', () => {
        render(<Button>Primary</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-primary');
    });

    it('applies secondary variant correctly', () => {
        render(<Button variant="secondary">Secondary</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-surface/50');
    });

    it('applies ghost variant correctly', () => {
        render(<Button variant="ghost">Ghost</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-transparent');
    });

    it('applies destructive variant correctly', () => {
        render(<Button variant="destructive">Delete</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('bg-red-600/80');
    });

    it('applies small size correctly', () => {
        render(<Button size="sm">Small</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('h-8');
    });

    it('applies large size correctly', () => {
        render(<Button size="lg">Large</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('h-12');
    });

    it('shows loading state', () => {
        render(<Button isLoading>Loading</Button>);
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(button.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    it('has proper focus styles for accessibility', () => {
        render(<Button>Accessible</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass('focus:ring-2');
        expect(button).toHaveClass('focus:ring-primary');
    });

    it('forwards ref correctly', () => {
        const ref = vi.fn();
        render(<Button ref={ref}>Ref</Button>);
        expect(ref).toHaveBeenCalled();
    });
});
