import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReportTemplateEditor } from './ReportTemplateEditor';

afterEach(cleanup);

describe('ReportTemplateEditor', () => {
    it('validates before saving and preserves the draft on failure, then permits retry', async () => {
        const save = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined);
        render(<ReportTemplateEditor onSave={save} onBack={() => {}} />);
        fireEvent.change(screen.getByRole('textbox', { name: 'Template name' }), { target: { value: ' ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Template name');
        expect(save).not.toHaveBeenCalled();
        fireEvent.change(screen.getByRole('textbox', { name: 'Template name' }), { target: { value: 'Client template' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));
        await screen.findByText(/Your changes are still here/);
        expect(screen.getByRole('textbox', { name: 'Template name' })).toHaveValue('Client template');
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));
        await screen.findByText('Template saved.');
        expect(save).toHaveBeenCalledTimes(2);
        expect(save.mock.calls[1][0].name).toBe('Client template');
    });

    it('coalesces repeated saves and prevents editing while a save is pending', async () => {
        let resolve!: () => void;
        const save = vi.fn(() => new Promise<void>(done => { resolve = done; }));
        render(<ReportTemplateEditor onSave={save} onBack={() => {}} />);
        const button = screen.getByRole('button', { name: 'Save Template' });
        act(() => { button.click(); button.click(); });
        expect(save).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('textbox', { name: 'Template name' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Export JSON' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Add Visibility Trends' })).toBeDisabled();
        await act(async () => resolve());
        expect(screen.getByRole('textbox', { name: 'Template name' })).toBeEnabled();
    });

    it('assigns unique IDs to rapid repeated additions and removes only the selected section', () => {
        render(<ReportTemplateEditor onSave={vi.fn()} onBack={() => {}} />);
        const add = screen.getByRole('button', { name: 'Add Visibility Trends' });
        act(() => { add.click(); add.click(); });
        expect(screen.getAllByRole('listitem')).toHaveLength(5);
        fireEvent.click(screen.getAllByRole('button', { name: 'Remove Visibility Trends' })[0]);
        expect(screen.getAllByRole('button', { name: 'Remove Visibility Trends' })).toHaveLength(1);
        expect(screen.getAllByRole('listitem')).toHaveLength(4);
    });

    it('preserves the existing layout when file reading fails and allows the same file to be retried', async () => {
        render(<ReportTemplateEditor onSave={vi.fn()} onBack={() => {}} />);
        const input = screen.getByLabelText('Import template JSON');
        const file = new File(['bad'], 'template.json', { type: 'application/json' });
        Object.defineProperty(file, 'text', { value: vi.fn().mockRejectedValueOnce(new Error('Could not read file')).mockResolvedValueOnce(JSON.stringify({ format: 'cognition-report-template', version: 1, name: 'Restored', layout: [{ type: 'trends', title: 'Visibility Trends' }] })) });
        fireEvent.change(input, { target: { files: [file] } });
        await screen.findByText('Could not read file');
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        fireEvent.change(input, { target: { files: [file] } });
        await waitFor(() => expect(screen.getByRole('textbox', { name: 'Template name' })).toHaveValue('Restored'));
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
});
