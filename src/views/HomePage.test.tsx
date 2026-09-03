import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCurriculumTree } from '@/curriculum/useCurriculumTree';
import { HomePage } from './HomePage';

vi.mock('@/curriculum/useCurriculumTree', () => ({
  useCurriculumTree: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('HomePage', () => {
  it('should show the full-page loading state before course data is ready', () => {
    vi.mocked(useCurriculumTree).mockReturnValue(null);

    render(<HomePage />);

    expect(screen.getByRole('status', { name: 'Loading course' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Learn Vim for Terminal Text Editing' })).toBeNull();
    expect(screen.queryByRole('contentinfo')).toBeNull();
  });
});
