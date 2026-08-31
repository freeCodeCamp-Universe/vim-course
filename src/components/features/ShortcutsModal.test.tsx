import { useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { SHORTCUTS_PREFERENCE_EVENT, SHORTCUTS_STORAGE_KEY } from '@/hooks/useShortcutsPreference';
import { ShortcutsModal } from './ShortcutsModal';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        keyboard shortcuts
      </button>
      <ShortcutsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

describe('ShortcutsModal', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should render nothing while closed', () => {
    render(<Harness />);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should render every course-navigation binding', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'keyboard shortcuts' }));

    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(within(dialog).getAllByRole('term')[0]).toHaveTextContent('Alt+/');
    expect(within(dialog).getByText('show keyboard shortcuts dialog')).toBeInTheDocument();
    expect(within(dialog).getByText('next lesson')).toBeInTheDocument();
    expect(within(dialog).getByText('previous lesson')).toBeInTheDocument();
    expect(within(dialog).getByText('focus terminal')).toBeInTheDocument();
    expect(within(dialog).getByText('focus instructions')).toBeInTheDocument();
    expect(within(dialog).getByText('open lesson list')).toBeInTheDocument();
    expect(within(dialog).getByText('run all checks / advance')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter')).toBeInTheDocument();
    // On non-Mac (test env), Cmd resolves to 'Ctrl'.
    expect(within(dialog).getByText('Ctrl')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Alt')).toHaveLength(6);
    expect(within(dialog).getByText('/')).toBeInTheDocument();
    expect(within(dialog).getByText('1')).toBeInTheDocument();
    expect(within(dialog).getByText('2')).toBeInTheDocument();
    expect(within(dialog).getByText('M')).toBeInTheDocument();
    expect(
      within(dialog).getByText('The following keyboard shortcuts are enabled.')
    ).toBeInTheDocument();
  });

  it('should explain when shortcuts are disabled', () => {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, 'false');

    render(<ShortcutsModal open onClose={() => {}} />);

    expect(
      screen.getByText(
        'These shortcuts are currently off. You can enable them in the settings dialog.'
      )
    ).toBeInTheDocument();
  });

  it('should update when the shortcuts preference changes', () => {
    render(<ShortcutsModal open onClose={() => {}} />);

    expect(screen.queryByText('These shortcuts are currently off.')).toBeNull();

    act(() => {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, 'false');
      window.dispatchEvent(new Event(SHORTCUTS_PREFERENCE_EVENT));
    });

    expect(
      screen.getByText(
        'These shortcuts are currently off. You can enable them in the settings dialog.'
      )
    ).toBeInTheDocument();
  });
});
