import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthoredLessonDefinition } from '@/curriculum/types';
import type { LessonSnapshot, VimTerminalView } from '@/terminal/vimTerminalView';
import { VimTerminal } from './VimTerminal';

const lesson: AuthoredLessonDefinition = {
  id: 'w1',
  module: 4,
  lesson: 1,
  title: 'Delete a character',
  instructions: 'delete a character',
  type: 'learn',
  files: { 'colors.txt': 'hello world' },
  config: {
    start: 'file',
    open: 'colors.txt',
    cursor: [1, 1],
    allowedCommands: ['x'],
    checklist: [{ label: 'Delete a character with x', test: { command: 'x' } }],
  },
};

describe('VimTerminal', () => {
  it('should mount the terminal and register the view on the ref', () => {
    const viewRef = createRef<VimTerminalView | null>();
    render(<VimTerminal lesson={lesson} onUpdate={() => {}} viewRef={viewRef} />);

    expect(screen.getByRole('application', { name: 'vim terminal' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveTextContent('hello world');
    expect(viewRef.current).not.toBeNull();
  });

  it('should push a snapshot up when a taught key advances the lesson', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn<(snapshot: LessonSnapshot) => void>();
    const viewRef = createRef<VimTerminalView | null>();
    render(<VimTerminal lesson={lesson} onUpdate={onUpdate} viewRef={viewRef} />);

    screen.getByRole('application').focus();
    await user.keyboard('x');

    expect(onUpdate).toHaveBeenCalled();
    expect(onUpdate.mock.lastCall?.[0].complete).toBe(true);
  });

  it('should leave exactly one terminal after a remount and clear the ref on unmount', () => {
    const viewRef = createRef<VimTerminalView | null>();
    const { unmount } = render(
      <VimTerminal lesson={lesson} onUpdate={() => {}} viewRef={viewRef} />
    );

    unmount();
    expect(viewRef.current).toBeNull();
    expect(screen.queryByRole('application')).not.toBeInTheDocument();

    render(<VimTerminal lesson={lesson} onUpdate={() => {}} viewRef={viewRef} />);
    expect(screen.getAllByRole('application')).toHaveLength(1);
  });
});
