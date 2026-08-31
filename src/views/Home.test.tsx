/* eslint-disable testing-library/no-node-access */
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Home } from './Home';

const modules = [
  {
    slug: 'modes',
    title: 'Modes',
    lessons: [
      { id: 'l1', title: 'Enter insert mode' },
      { id: 'l2', title: 'Save and quit' },
    ],
  },
];

afterEach(() => {
  localStorage.clear();
});

describe('Home', () => {
  it('should render completion state from the shared progress storage', () => {
    localStorage.setItem('vim-course:progress', JSON.stringify({ version: 1, completed: ['l1'] }));

    render(<Home modules={modules} orderedLessonIds={['l1', 'l2']} />);

    const completed = screen.getByRole('link', { name: /Enter insert mode/ });
    expect(completed.closest('[data-lesson-id]')).toHaveAttribute('data-state', 'completed');
    expect(within(completed).getByText(/completed/i)).toBeInTheDocument();
    expect(screen.getByText('1/2 lessons completed')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('1 out of 2 lessons completed')).toHaveClass('sr-only');
    expect(screen.queryByRole('link', { name: 'Continue' })).toBeNull();
  });
});
