import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProseLessonDefinition, AuthoredLessonDefinition } from '@/curriculum/types';
import { renderMarkdown } from '@/components/base/Markdown/renderMarkdown';
import { INITIAL_FOCUS_STORAGE_KEY } from '@/hooks/useInitialFocusPreference';
import { LessonWorkspace } from './LessonWorkspace';

const workshop: AuthoredLessonDefinition = {
  id: 'w-1',
  module: 1,
  lesson: 1,
  title: 'Delete a character',
  type: 'learn',
  instructions: 'Press `x` to delete the character under the cursor.',
  files: { 'a.txt': 'hello' },
  config: {
    start: 'file',
    open: 'a.txt',
    cursor: [1, 1],
    allowedCommands: ['x'],
    checklist: [{ label: 'Delete a character with x', test: { command: 'x' } }],
  },
};

const prose: ProseLessonDefinition = {
  id: 'r-1',
  module: 1,
  lesson: 1,
  title: 'About modes',
  type: 'review',
  instructions: '## Modes\n\nVim has modes.',
};

const orderedIds = [workshop.id, prose.id, 'trailing-id'];

function renderWorkspace(
  lesson: AuthoredLessonDefinition | ProseLessonDefinition,
  tab: 'instructions' | 'terminal' = 'instructions'
) {
  const instructionsHtml = renderMarkdown(lesson.instructions);
  return render(<LessonWorkspace lesson={lesson} orderedLessonIds={orderedIds} instructionsHtml={instructionsHtml} tab={tab} onSelectTab={vi.fn()} />);
}

describe('LessonWorkspace', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should focus the terminal on load for interactive lessons', () => {
    // The terminal view's focus() method checks offsetParent to avoid focusing
    // a collapsed tab panel. jsdom returns null for offsetParent (no layout),
    // so mock it to simulate the desktop side-by-side layout.
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() {
        return document.body;
      },
      configurable: true,
    });

    try {
      renderWorkspace(workshop);

      expect(screen.getByRole('application', { name: 'vim terminal' })).toHaveFocus();
      expect(screen.queryByText('completed')).not.toBeInTheDocument();
    } finally {
      if (original) {
        Object.defineProperty(HTMLElement.prototype, 'offsetParent', original);
      }
    }
  });

  it('should show a completed icon and status before a completed lesson title', () => {
    localStorage.setItem('vim-course:progress', JSON.stringify({ version: 1, completed: ['w-1'] }));
    renderWorkspace(workshop);

    const heading = screen.getByRole('heading', { level: 1, name: /Delete a character/ });
    expect(within(heading).getByText('completed')).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- aria-hidden SVG has no accessible role to query
    expect(heading.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render the terminal, checklist, and controls for a workshop', () => {
    renderWorkspace(workshop);

    expect(screen.getByRole('application', { name: 'vim terminal' })).toBeInTheDocument();
    expect(screen.getByText('Delete a character with x')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next (Ctrl + Enter)' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('should explain what is missing when the advance shortcut is used on an unfinished lesson', async () => {
    const user = userEvent.setup();
    renderWorkspace(workshop);

    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Delete a character' })
    ).toBeInTheDocument();
    expect(screen.getByText(/some steps aren't done yet/i)).toBeInTheDocument();
  });

  it('should announce the tab change when the tab prop changes', async () => {
    const { rerender } = renderWorkspace(workshop, 'instructions');

    // No announcement on initial render.
    expect(screen.queryByText('terminal', { exact: true })).not.toBeInTheDocument();

    rerender(<LessonWorkspace lesson={workshop} orderedLessonIds={orderedIds} instructionsHtml={renderMarkdown(workshop.instructions)} tab="terminal" onSelectTab={vi.fn()} />);

    expect(screen.getByText('terminal', { exact: true })).toBeInTheDocument();
  });

  it('should render a reading lesson as prose only, with no terminal, checklist, or reset', () => {
    renderWorkspace(prose);

    expect(screen.getByRole('heading', { level: 1, name: 'About modes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Modes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    expect(screen.queryByRole('application')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });

  it('should include the instructions panel in the tab order', () => {
    renderWorkspace(workshop);

    const instructions = screen.getByRole('region', { name: /Delete a character/i });
    expect(instructions).toHaveAttribute('tabindex', '0');
  });

  it('should focus the instructions panel on load when the preference is enabled', () => {
    localStorage.setItem(INITIAL_FOCUS_STORAGE_KEY, 'true');

    renderWorkspace(workshop);

    const instructions = screen.getByRole('region', { name: /Delete a character/i });
    expect(instructions).toHaveFocus();
  });
});
