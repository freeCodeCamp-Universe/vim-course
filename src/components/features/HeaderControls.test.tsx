import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { courseChrome } from '@/stores/courseChrome';
import { HeaderControls } from './HeaderControls';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  courseChrome.reset();
});

describe('HeaderControls', () => {
  it('should render the drawer, shortcuts, and settings controls', () => {
    render(<HeaderControls />);

    expect(screen.getByRole('button', { name: /open lessons/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'settings' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /switch to light theme/i })
    ).not.toBeInTheDocument();
  });

  it('should hide the drawer control when requested', () => {
    render(<HeaderControls showDrawer={false} />);

    expect(screen.queryByRole('button', { name: /open lessons/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it('should hide the shortcuts control when requested', () => {
    render(<HeaderControls showShortcuts={false} />);

    expect(screen.queryByRole('button', { name: /keyboard shortcuts/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open lessons/i })).toBeInTheDocument();
  });

  it('should open the drawer and shortcuts through the shared store when their buttons are activated', async () => {
    const user = userEvent.setup();
    render(<HeaderControls />);

    await user.click(screen.getByRole('button', { name: /open lessons/i }));
    expect(courseChrome.getState().drawerOpen).toBe(true);

    await user.click(screen.getByRole('button', { name: /keyboard shortcuts/i }));
    expect(courseChrome.getState().shortcutsOpen).toBe(true);

    await user.click(screen.getByRole('button', { name: 'settings' }));
    expect(courseChrome.getState().settingsOpen).toBe(true);
  });
});
