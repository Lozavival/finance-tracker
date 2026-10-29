import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { screen } from '@testing-library/react';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { renderWithProviders } from '../../helpers/render-with-providers';
import { InMemoryFinanceRepository } from '@/data/repository';

describe('OfflineBanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ result: 'success', rates: { BRL: 5.5 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  it('renders loading state on initial load', () => {
    renderWithProviders(<OfflineBanner />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders offline alert when syncStatus is offline', async () => {
    const repo = new InMemoryFinanceRepository('development');
    vi.spyOn(repo, 'loadWorkspace').mockRejectedValueOnce(new Error('Offline'));

    renderWithProviders(<OfflineBanner />, { repository: repo });

    const offlineText = await screen.findByText(/reach the server/i);
    expect(offlineText).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
