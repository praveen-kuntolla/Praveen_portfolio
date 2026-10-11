import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MediaManager } from './manager';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('media manager', () => {
  it('shows setup instructions without credentials and does not expose editing fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ configured: false, authenticated: false })));
    render(<MediaManager />);
    expect(await screen.findByText(/Complete SUPABASE_SETUP.md/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Media URL')).not.toBeInTheDocument();
  });
  it('saves a published image through the server API and clears the form', async () => {
    const requests: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      requests.push({ url, init });
      if (url.endsWith('/session')) return Response.json({ configured: true, authenticated: true });
      if (init?.method === 'POST') return Response.json({ saved: true });
      return Response.json({ records: [] });
    }));
    render(<MediaManager />);
    await screen.findByLabelText('Media URL');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Published photograph' } });
    fireEvent.change(screen.getByLabelText('Media URL'), { target: { value: 'https://drive.google.com/file/d/1wAI_0FNF52X7rONMs6FgQbI0McxFl9mq/view?usp=drive_link' } });
    fireEvent.click(screen.getByLabelText('Published'));
    fireEvent.click(screen.getByText('Preview', { selector: 'button' }));
    expect(screen.getByAltText('Published photograph')).toHaveAttribute('src', 'https://drive.google.com/thumbnail?id=1wAI_0FNF52X7rONMs6FgQbI0McxFl9mq&sz=w1600');
    fireEvent.click(screen.getByText('Save media'));
    await waitFor(() => expect(requests.some(r => r.init?.method === 'POST')).toBe(true));
    const saved = requests.find(r => r.init?.method === 'POST')!;
    expect(JSON.parse(saved.init!.body as string)).toMatchObject({ title: 'Published photograph', published: true, media_type: 'image', media_url: 'https://drive.google.com/file/d/1wAI_0FNF52X7rONMs6FgQbI0McxFl9mq/view?usp=drive_link' });
    expect(await screen.findByText(/Saved. Published changes/)).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });
  it('shows server validation errors without clearing the edit', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => init?.method === 'POST' ? Response.json({ error: 'Record could not be saved.' }, { status: 503 }) : _url.endsWith('/session') ? Response.json({ configured: true, authenticated: true }) : Response.json({ records: [] })));
    render(<MediaManager />);
    await screen.findByLabelText('Title');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Keep this title' } });
    fireEvent.change(screen.getByLabelText('Media URL'), { target: { value: 'https://drive.google.com/file/d/1wAI_0FNF52X7rONMs6FgQbI0McxFl9mq/view?usp=drive_link' } });
    fireEvent.click(screen.getByText('Save media'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Record could not be saved.');
    expect(screen.getByLabelText('Title')).toHaveValue('Keep this title');
  });
});

