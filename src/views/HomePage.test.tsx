/* eslint-disable testing-library/no-node-access */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCurriculumTree } from '@/curriculum/useCurriculumTree';
import { seoConfig } from '@/utils/seo.config';
import { HomePage } from './HomePage';

vi.mock('@/curriculum/useCurriculumTree', () => ({
  useCurriculumTree: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  document.head.querySelectorAll('meta[name], meta[property]').forEach((el) => el.remove());
});

describe('HomePage', () => {
  it('should show the full-page loading state before course data is ready', () => {
    vi.mocked(useCurriculumTree).mockReturnValue(null);

    render(<HomePage />);

    expect(document.title).toBe(seoConfig.siteTitle);
    expect(screen.getByRole('status', { name: 'Loading course' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Learn Vim for Terminal Text Editing' })).toBeNull();
    expect(screen.queryByRole('contentinfo')).toBeNull();
  });

  it('should set og:title and twitter:title', () => {
    vi.mocked(useCurriculumTree).mockReturnValue(null);

    render(<HomePage />);

    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(seoConfig.siteTitle);
    expect(document.head.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(seoConfig.siteTitle);
  });

  it('should set meta description, og:description, and twitter:description', () => {
    vi.mocked(useCurriculumTree).mockReturnValue(null);

    render(<HomePage />);

    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(seoConfig.siteDescription);
    expect(document.head.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(seoConfig.siteDescription);
    expect(document.head.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe(seoConfig.siteDescription);
  });
});
