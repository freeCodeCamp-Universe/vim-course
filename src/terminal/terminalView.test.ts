import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/react';
import { createTerminalView, type TerminalView, type TerminalViewModel } from './terminalView';
import styles from './terminalView.module.css';

function model(overrides: Partial<TerminalViewModel> = {}): TerminalViewModel {
  return {
    lines: ['hello'],
    gutter: null,
    cursor: null,
    cursorStyle: 'block',
    selection: null,
    visited: null,
    footerStart: '',
    footerEnd: '',
    announcement: '',
    ...overrides,
  };
}

let mounted: TerminalView | null = null;

/** Mount a view into the document and paint an initial frame. */
function mount(
  options: {
    accessibleName?: string;
    onKey?: (key: string) => void;
    onPaste?: (text: string) => void;
  } = {}
) {
  const view = createTerminalView({
    accessibleName: options.accessibleName ?? 'terminal',
    onKey: options.onKey ?? (() => {}),
    onPaste: options.onPaste,
  });
  document.body.appendChild(view.el);
  mounted = view;
  const q = within(view.el);
  return { view, q, screen: () => q.getByRole('application') };
}

afterEach(() => {
  mounted?.destroy();
  mounted = null;
  vi.restoreAllMocks();
});

describe('createTerminalView', () => {
  it('should render every line from the model', () => {
    const { view, q } = mount();
    view.update(model({ lines: ['first line', 'second line'] }));

    expect(q.getByText('first line')).toBeInTheDocument();
    expect(q.getByText('second line')).toBeInTheDocument();
  });

  it('should render both footer cells', () => {
    const { view, q } = mount();
    view.update(model({ footerStart: '-- INSERT --', footerEnd: '1,1' }));

    expect(within(mounted!.el).getByText('-- INSERT --')).toBeInTheDocument();
    expect(within(mounted!.el).getByText('1,1')).toBeInTheDocument();
    expect(q.getByText('-- INSERT --')).toHaveClass(styles['footer-start']);
  });

  it('should keep long leading footer content separate from the ruler column', () => {
    const { view, q } = mount();
    view.update(
      model({
        footerStart: '"a-file-with-a-very-long-name.txt" line 1 of 1 --100%-- col 1',
        footerEnd: '1,1',
      })
    );

    const footer = q.getByTestId('terminal-footer');
    const start = q.getByText(/a-file-with-a-very-long-name/);
    const ruler = q.getByText('1,1');

    expect(start).toHaveClass(styles['footer-start']);
    expect(ruler).toBeInTheDocument();
    expect(within(footer).getByText(/a-file-with-a-very-long-name/)).toBe(start);
    expect(within(footer).getByText('1,1')).toBe(ruler);
  });

  it('should let the leading footer use the ruler column when hidden', () => {
    const { view, q } = mount();
    view.update(
      model({
        footerStart: '"a-file-with-a-very-long-name.txt" line 1 of 1 --100%-- col 1',
        footerEnd: '1,1',
        footerEndVisible: false,
      })
    );

    expect(q.getByText('1,1')).not.toBeVisible();
    expect(q.getByText(/a-file-with-a-very-long-name/)).toBeInTheDocument();
  });

  it('should style an error footer without keeping the class for informational text', () => {
    const { view, q } = mount();
    view.update(model({ footerStart: 'E42: No Errors', footerIsError: true }));

    const errorFooter = q.getByText('E42: No Errors');
    expect(errorFooter).toHaveClass(styles['status-error']);

    view.update(model({ footerStart: '3 matches on 2 lines' }));
    expect(q.getByText('3 matches on 2 lines')).not.toHaveClass(styles['status-error']);
  });

  it('should mark a continuation hint for themed styling', () => {
    const { view, q } = mount();
    view.update(model({ footerStart: '-- More --', footerIsHint: true }));

    expect(q.getByText('-- More --')).toHaveAttribute('data-terminal-hint');

    view.update(model({ footerStart: 'Normal mode' }));
    expect(q.getByText('Normal mode')).not.toHaveAttribute('data-terminal-hint');
  });

  it('should render the footer cursor at the end of ASCII footer text', () => {
    const { view, q } = mount();
    view.update(model({ footerStart: ':sub', footerCursor: 4, cursorStyle: 'block' }));

    expect(q.getByTestId('terminal-cursor')).toBeInTheDocument();
  });

  it('should render the footer cursor at the end of footer text containing a supplementary-plane character', () => {
    const { view, q } = mount();
    // 𐂐 is U+10090, a supplementary-plane character: .length === 2, textLength === 1.
    // The cursor must land on the space padded past it, not disappear because
    // padEnd() counted UTF-16 units instead of code points.
    view.update(model({ footerStart: ':𐂐', footerCursor: 2, cursorStyle: 'block' }));

    expect(q.getByTestId('terminal-cursor')).toBeInTheDocument();
  });

  it('should render the footer cursor mid-text containing a supplementary-plane character', () => {
    const { view, q } = mount();
    // Cursor at code-point position 1 (on the 𐂐 itself).
    view.update(model({ footerStart: ':𐂐x', footerCursor: 1, cursorStyle: 'block' }));

    expect(q.getByTestId('terminal-cursor')).toHaveTextContent('𐂐');
  });

  it('should apply cursor colors to cursor-style selections', () => {
    const { view, q } = mount();
    view.update(
      model({
        lines: ['selected'],
        selection: { start: { line: 0, col: 0 }, end: { line: 0, col: 8 } },
        selectionStyle: 'cursor',
      })
    );

    expect(q.getByTestId('terminal-selection')).toHaveClass(styles['cursor-selection']);
  });

  it('should render a gutter label ahead of each line and offset the text column by its width', () => {
    const { view, q } = mount();
    view.update(
      model({
        lines: ['first line', 'second line'],
        gutter: [' 1', ' 2'],
        cursor: { line: 1, col: 0 },
      })
    );

    const grid = q.getByRole('list');
    expect(grid).toHaveTextContent('1first line');
    expect(grid).toHaveTextContent('2second line');
    expect(grid.style.getPropertyValue('--terminal-gutter-width')).toBe('2ch');
    expect(q.getAllByTestId('terminal-gutter')[0]).toHaveTextContent('1');
  });

  it('should render no gutter when none is supplied', () => {
    const { view, q } = mount();
    view.update(model({ lines: ['first line'] }));

    expect(q.getByText('first line')).toBeInTheDocument();
    expect(q.getByRole('list').style.getPropertyValue('--terminal-gutter-width')).toBe('');
    expect(q.queryByTestId('terminal-gutter')).not.toBeInTheDocument();
  });

  it('should keep a selection range measured from the text, not the gutter', () => {
    const { view, q } = mount();
    view.update(
      model({
        lines: ['abcdef'],
        gutter: [' 1'],
        selection: { start: { line: 0, col: 2 }, end: { line: 0, col: 4 } },
      })
    );

    expect(q.getByTestId('terminal-selection')).toHaveTextContent('cd');
  });

  it('should render the cursor as the cell it sits on so wrapping carries it along', () => {
    const { view, q } = mount();
    view.update(model({ lines: ['abcdef', 'ghijkl'], cursor: { line: 1, col: 3 } }));

    expect(q.getByTestId('terminal-cursor')).toHaveTextContent('j');
  });

  it('should scroll the cursor line into view after painting', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    const { view } = mount();

    view.update(model({ lines: ['first', 'second'], cursor: { line: 1, col: 0 } }));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('should render an astral Unicode character as one cursor cell', () => {
    const { view, q } = mount();
    view.update(model({ lines: ['M𝒆𝒐𝒘'], cursor: { line: 0, col: 1 } }));

    expect(q.getByTestId('terminal-cursor')).toHaveTextContent('𝒆');
  });

  it('should keep a combining mark attached to its base character in the cursor cell', () => {
    const { view, q } = mount();
    view.update(model({ lines: ['a݁b'], cursor: { line: 0, col: 0 } }));

    expect(q.getByTestId('terminal-cursor')).toHaveTextContent('a݁');
    expect(q.getByRole('list')).toHaveTextContent('a݁b');
  });

  it('should give the cursor a blank cell past the end of a line', () => {
    const { view, q } = mount();
    view.update(model({ lines: [''], cursor: { line: 0, col: 0 } }));

    expect(q.getByTestId('terminal-cursor')).toBeInTheDocument();
  });

  it('should render the cursor cell inside a selection that covers it', () => {
    const { view, q } = mount();
    view.update(
      model({
        lines: ['abcdef'],
        cursor: { line: 0, col: 3 },
        selection: { start: { line: 0, col: 2 }, end: { line: 0, col: 5 } },
      })
    );

    expect(q.getByTestId('terminal-cursor')).toHaveTextContent('d');
    expect(q.getByRole('list')).toHaveTextContent('abcdef');
  });

  it('should render marked text as a decoration span', () => {
    const { view, q } = mount();
    view.update(
      model({
        lines: ['abcdef'],
        decorations: [
          {
            range: { start: { line: 0, col: 1 }, end: { line: 0, col: 3 } },
            variant: 'mark',
          },
        ],
      })
    );

    expect(q.getByTestId('terminal-mark')).toHaveTextContent('bc');
  });

  it('should render quickfix locations with their own decoration', () => {
    const { view, q } = mount();
    view.update(
      model({
        lines: ['  1 src/file.ts:3 col 4: matched text'],
        decorations: [
          {
            range: { start: { line: 0, col: 4 }, end: { line: 0, col: 24 } },
            variant: 'qf-location',
          },
        ],
      })
    );

    expect(q.getByTestId('terminal-qf-location')).toHaveTextContent('src/file.ts:3 col 4:');
  });

  it('should carve the cursor cell out of a decoration span', () => {
    const { view, q } = mount();
    view.update(
      model({
        lines: ['abcdef'],
        cursor: { line: 0, col: 2 },
        decorations: [
          {
            range: { start: { line: 0, col: 1 }, end: { line: 0, col: 4 } },
            variant: 'mark',
          },
        ],
      })
    );

    const mark = q.getByTestId('terminal-mark');
    expect(mark).toContainElement(q.getByTestId('terminal-cursor'));
    expect(q.getByTestId('terminal-cursor')).toHaveTextContent('c');
  });

  it('should give selection precedence over overlapping decorations', () => {
    const { view, q } = mount();
    view.update(
      model({
        lines: ['abcdef'],
        selection: { start: { line: 0, col: 2 }, end: { line: 0, col: 4 } },
        decorations: [
          {
            range: { start: { line: 0, col: 1 }, end: { line: 0, col: 5 } },
            variant: 'mark',
          },
        ],
      })
    );

    expect(q.getAllByTestId('terminal-mark')[0]).toHaveTextContent('b');
    expect(q.getByTestId('terminal-selection')).toHaveTextContent('cd');
    expect(q.getAllByTestId('terminal-mark')).toHaveLength(2);
    expect(q.getAllByTestId('terminal-mark')[1]).toHaveTextContent('e');
  });

  it('should render multiple non-overlapping decorations independently', () => {
    const { view, q } = mount();
    view.update(
      model({
        lines: ['abcdef'],
        decorations: [
          {
            range: { start: { line: 0, col: 0 }, end: { line: 0, col: 1 } },
            variant: 'mark',
          },
          {
            range: { start: { line: 0, col: 3 }, end: { line: 0, col: 5 } },
            variant: 'mark',
          },
        ],
      })
    );

    expect(q.getAllByTestId('terminal-mark')).toHaveLength(2);
    expect(q.getAllByTestId('terminal-mark')[0]).toHaveTextContent('a');
    expect(q.getAllByTestId('terminal-mark')[1]).toHaveTextContent('de');
  });

  it('should render no mark spans when decorations are absent', () => {
    const { view, q } = mount();
    view.update(model({ lines: ['abcdef'] }));

    expect(q.queryByTestId('terminal-mark')).not.toBeInTheDocument();
  });

  it('should expose a labelled interactive region and a distinct buffer region', () => {
    const { view, q } = mount({ accessibleName: 'editor' });
    view.update(model({ lines: ['alpha', 'beta'] }));

    expect(q.getByRole('application', { name: 'editor' })).toBeInTheDocument();
    const buffer = q.getByRole('list', { name: 'editor contents' });
    expect(within(buffer).getByText('alpha')).toBeInTheDocument();
    expect(buffer).not.toContainElement(q.getByTestId('terminal-announcement'));
  });

  it('should set aria-roledescription to terminal on the application region', () => {
    const { screen } = mount({ accessibleName: 'editor' });

    expect(screen()).toHaveAttribute('aria-roledescription', 'terminal');
  });

  it('should forward a captured printable key and prevent its default', () => {
    const onKey = vi.fn();
    const { screen } = mount({ onKey });

    const prevented = fireEvent.keyDown(screen(), { key: 'i' });

    expect(prevented).toBe(false);
    expect(onKey).toHaveBeenCalledWith('i');
  });

  it('should let Tab move focus out rather than capturing it', () => {
    const onKey = vi.fn();
    const { screen } = mount({ onKey });

    const notPrevented = fireEvent.keyDown(screen(), { key: 'Tab' });

    expect(notPrevented).toBe(true);
    expect(onKey).not.toHaveBeenCalled();
  });

  it('should normalize Ctrl-r and Ctrl-g regardless of reported key case', () => {
    const onKey = vi.fn();
    const { screen } = mount({ onKey });

    fireEvent.keyDown(screen(), { key: 'r', ctrlKey: true });
    fireEvent.keyDown(screen(), { key: 'R', ctrlKey: true });
    fireEvent.keyDown(screen(), { key: 'G', ctrlKey: true });

    expect(onKey).toHaveBeenNthCalledWith(1, 'Ctrl-r');
    expect(onKey).toHaveBeenNthCalledWith(2, 'Ctrl-r');
    expect(onKey).toHaveBeenNthCalledWith(3, 'Ctrl-g');
  });

  it('should let an unrecognized Ctrl combo pass through untouched', () => {
    const onKey = vi.fn();
    const { screen } = mount({ onKey });

    fireEvent.keyDown(screen(), { key: 'a', ctrlKey: true });

    expect(onKey).not.toHaveBeenCalled();
  });

  it('should capture Alt+Arrow keys for shell word-jump', () => {
    const onKey = vi.fn();
    const { screen } = mount({ onKey });

    fireEvent.keyDown(screen(), { key: 'ArrowLeft', altKey: true });
    fireEvent.keyDown(screen(), { key: 'ArrowRight', altKey: true });

    expect(onKey).toHaveBeenNthCalledWith(1, 'Alt-ArrowLeft');
    expect(onKey).toHaveBeenNthCalledWith(2, 'Alt-ArrowRight');
  });

  it('should capture Ctrl+Arrow keys for shell word-jump', () => {
    const onKey = vi.fn();
    const { screen } = mount({ onKey });

    fireEvent.keyDown(screen(), { key: 'ArrowLeft', ctrlKey: true });
    fireEvent.keyDown(screen(), { key: 'ArrowRight', ctrlKey: true });

    expect(onKey).toHaveBeenNthCalledWith(1, 'Ctrl-ArrowLeft');
    expect(onKey).toHaveBeenNthCalledWith(2, 'Ctrl-ArrowRight');
  });

  it('should capture Alt+Backspace and Ctrl+Backspace for shell word-delete', () => {
    const onKey = vi.fn();
    const { screen } = mount({ onKey });

    fireEvent.keyDown(screen(), { key: 'Backspace', altKey: true });
    fireEvent.keyDown(screen(), { key: 'Backspace', ctrlKey: true });

    expect(onKey).toHaveBeenNthCalledWith(1, 'Alt-Backspace');
    expect(onKey).toHaveBeenNthCalledWith(2, 'Ctrl-Backspace');
  });

  it('should still let non-arrow Alt combos pass through', () => {
    const onKey = vi.fn();
    const { screen } = mount({ onKey });

    fireEvent.keyDown(screen(), { key: 'a', altKey: true });

    expect(onKey).not.toHaveBeenCalled();
  });

  it('should ignore modifier-only keydown events', () => {
    const onKey = vi.fn();
    const { screen } = mount({ onKey });

    fireEvent.keyDown(screen(), { key: 'Shift' });
    fireEvent.keyDown(screen(), { key: 'Control' });
    fireEvent.keyDown(screen(), { key: 'Alt' });
    fireEvent.keyDown(screen(), { key: 'Meta' });
    fireEvent.keyDown(screen(), { key: 'CapsLock' });

    expect(onKey).not.toHaveBeenCalled();
  });

  it('should speak a new announcement but not re-announce a repeat or an empty one', () => {
    const { view, q } = mount();

    view.update(model({ announcement: 'insert mode' }));
    expect(q.getByTestId('terminal-announcement')).toHaveTextContent('insert mode');

    // An empty announcement and a repeat both leave the region untouched.
    view.update(model({ lines: ['edited'], announcement: '' }));
    expect(q.getByTestId('terminal-announcement')).toHaveTextContent('insert mode');
    view.update(model({ announcement: 'insert mode' }));
    expect(q.getByTestId('terminal-announcement')).toHaveTextContent('insert mode');

    view.update(model({ announcement: 'normal mode' }));
    expect(q.getByTestId('terminal-announcement')).toHaveTextContent('normal mode');
  });

  it('should focus the screen when it is on screen and report the move', () => {
    const { view, screen } = mount();
    // jsdom reports every element as hidden (`offsetParent` null); simulate a
    // laid-out screen so the visible branch runs.
    Object.defineProperty(screen(), 'offsetParent', { value: document.body, configurable: true });

    const moved = view.focus();

    expect(moved).toBe(true);
    expect(screen()).toHaveFocus();
  });

  it('should no-op focus and report false when the screen is off screen', () => {
    const { view, screen } = mount();

    expect(view.focus()).toBe(false);
    expect(screen()).not.toHaveFocus();
  });

  it('should remove the element and stop capturing keys on destroy', () => {
    const onKey = vi.fn();
    const view = createTerminalView({ accessibleName: 'terminal', onKey });
    document.body.appendChild(view.el);
    const screen = within(view.el).getByRole('application');

    view.destroy();

    expect(document.body.contains(view.el)).toBe(false);
    fireEvent.keyDown(screen, { key: 'i' });
    expect(onKey).not.toHaveBeenCalled();
  });

  it('should render visited cells with a distinct class', () => {
    const { view, q } = mount();
    const visited = new Set(['0,1', '0,3']);
    view.update(model({ lines: ['abcde'], visited }));

    const grid = q.getByRole('list');
    const visitedSpans = within(grid).getAllByTestId('terminal-visited');
    expect(visitedSpans).toHaveLength(2);
    expect(visitedSpans[0]).toHaveTextContent('b');
    expect(visitedSpans[1]).toHaveTextContent('d');
  });

  it('should not render visited spans when visited is null', () => {
    const { view, q } = mount();
    view.update(model({ lines: ['abcde'], visited: null }));

    const grid = q.getByRole('list');
    expect(within(grid).queryByTestId('terminal-visited')).not.toBeInTheDocument();
  });

  it('should render pending command keys above the ruler', () => {
    const { view, q } = mount();
    view.update(model({ footerEnd: '1,1', footerPending: '3d' }));

    const pending = q.getByTestId('terminal-pending');
    expect(pending).toHaveTextContent('3d');
    expect(q.getByText('1,1')).toBeInTheDocument();
  });

  it('should hide the pending element when no keys are pending', () => {
    const { view, q } = mount();
    view.update(model({ footerEnd: '1,1' }));

    const pending = q.getByTestId('terminal-pending');
    expect(pending).toHaveTextContent('');
  });

  it('should clear the pending element when keys resolve', () => {
    const { view, q } = mount();
    view.update(model({ footerPending: '7' }));
    expect(q.getByTestId('terminal-pending')).toHaveTextContent('7');

    view.update(model({ footerPending: undefined }));
    expect(q.getByTestId('terminal-pending')).toHaveTextContent('');
  });

  describe('paste', () => {
    it('should read the clipboard via Clipboard API on Cmd+V', async () => {
      const onPaste = vi.fn();
      const { screen } = mount({ onPaste });

      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: vi.fn().mockResolvedValue('pasted text') },
        writable: true,
        configurable: true,
      });

      const prevented = fireEvent.keyDown(screen(), { key: 'v', metaKey: true });

      expect(prevented).toBe(false);
      // readText is async; flush the microtask queue.
      await vi.waitFor(() => {
        expect(onPaste).toHaveBeenCalledWith('pasted text');
      });
    });

    it('should read the clipboard via Clipboard API on Ctrl+V', async () => {
      const onPaste = vi.fn();
      const { screen } = mount({ onPaste });

      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: vi.fn().mockResolvedValue('ctrl pasted') },
        writable: true,
        configurable: true,
      });

      fireEvent.keyDown(screen(), { key: 'v', ctrlKey: true });

      await vi.waitFor(() => {
        expect(onPaste).toHaveBeenCalledWith('ctrl pasted');
      });
    });

    it('should not call onPaste when clipboard text is empty', async () => {
      const onPaste = vi.fn();
      const { screen } = mount({ onPaste });

      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: vi.fn().mockResolvedValue('') },
        writable: true,
        configurable: true,
      });

      fireEvent.keyDown(screen(), { key: 'v', metaKey: true });

      // Give the promise a tick to resolve.
      await new Promise((r) => setTimeout(r, 0));
      expect(onPaste).not.toHaveBeenCalled();
    });

    it('should silently ignore a clipboard permission denial', async () => {
      const onPaste = vi.fn();
      const { screen } = mount({ onPaste });

      Object.defineProperty(navigator, 'clipboard', {
        value: { readText: vi.fn().mockRejectedValue(new DOMException('denied')) },
        writable: true,
        configurable: true,
      });

      // Should not throw.
      fireEvent.keyDown(screen(), { key: 'v', metaKey: true });

      await new Promise((r) => setTimeout(r, 0));
      expect(onPaste).not.toHaveBeenCalled();
    });

    it('should not intercept Cmd+V when onPaste is not provided', () => {
      const onKey = vi.fn();
      const { screen } = mount({ onKey });

      // Without onPaste, the Cmd+V keydown should pass through (not prevented).
      const notPrevented = fireEvent.keyDown(screen(), { key: 'v', metaKey: true });

      expect(notPrevented).toBe(true);
      expect(onKey).not.toHaveBeenCalled();
    });

    it('should forward text from a paste event as a fallback', () => {
      const onPaste = vi.fn();
      const { screen } = mount({ onPaste });

      fireEvent.paste(screen(), {
        clipboardData: { getData: () => 'fallback paste' },
      });

      expect(onPaste).toHaveBeenCalledWith('fallback paste');
    });

    it('should not call onPaste on a paste event with empty text', () => {
      const onPaste = vi.fn();
      const { screen } = mount({ onPaste });

      fireEvent.paste(screen(), {
        clipboardData: { getData: () => '' },
      });

      expect(onPaste).not.toHaveBeenCalled();
    });

    it('should stop forwarding paste events after destroy', () => {
      const onPaste = vi.fn();
      const view = createTerminalView({
        accessibleName: 'terminal',
        onKey: () => {},
        onPaste,
      });
      document.body.appendChild(view.el);
      const screen = within(view.el).getByRole('application');

      view.destroy();

      fireEvent.paste(screen, {
        clipboardData: { getData: () => 'after destroy' },
      });
      expect(onPaste).not.toHaveBeenCalled();
    });
  });

  describe('row semantics', () => {
    it('should render each line as a listitem with position attributes', () => {
      const { view, q } = mount();
      view.update(model({ lines: ['alpha', 'beta', 'gamma'] }));

      const items = q.getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveAttribute('aria-posinset', '1');
      expect(items[0]).toHaveAttribute('aria-setsize', '3');
      expect(items[2]).toHaveAttribute('aria-posinset', '3');
      expect(items[2]).toHaveAttribute('aria-setsize', '3');
    });

    it('should use a non-breaking space for empty lines so screen readers announce them', () => {
      const { view, q } = mount();
      view.update(model({ lines: ['hello', '', 'world'] }));

      const items = q.getAllByRole('listitem');
      expect(items[1].textContent).toBe(' ');
    });
  });

  describe('lineRoles', () => {
    it('should hide decorative lines from assistive tech and exclude them from setsize', () => {
      const { view, q } = mount();
      view.update(
        model({
          lines: ['alpha', 'beta', '~', '~'],
          lineRoles: ['content', 'content', 'decorative', 'decorative'],
        })
      );

      const items = q.getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveAttribute('aria-setsize', '2');
      expect(items[1]).toHaveAttribute('aria-posinset', '2');
      expect(items[1]).toHaveAttribute('aria-setsize', '2');

      const grid = q.getByRole('list');
      const hiddenLines = grid.querySelectorAll('[aria-hidden="true"]');
      expect(hiddenLines).toHaveLength(2);
    });

    it('should wrap consecutive img-role lines in a described image container', () => {
      const { view, q } = mount();
      view.update(
        model({
          lines: ['art1', 'art2', 'content line'],
          lineRoles: [{ role: 'img', label: 'logo' }, { role: 'img', label: 'logo' }, 'content'],
        })
      );

      const img = q.getByRole('img', { name: 'logo' });
      expect(img).toBeInTheDocument();
      expect(img.children).toHaveLength(2);

      const items = q.getAllByRole('listitem');
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveAttribute('aria-setsize', '1');
    });

    it('should not group img lines with different labels into the same container', () => {
      const { view, q } = mount();
      view.update(
        model({
          lines: ['a', 'b', 'c'],
          lineRoles: [{ role: 'img', label: 'first' }, { role: 'img', label: 'second' }, 'content'],
        })
      );

      const imgs = q.getAllByRole('img');
      expect(imgs).toHaveLength(2);
      expect(imgs[0]).toHaveAttribute('aria-label', 'first');
      expect(imgs[1]).toHaveAttribute('aria-label', 'second');
    });
  });

  describe('announcement de-duplication', () => {
    it('should re-announce repeated identical text via a DOM mutation', () => {
      const { view, q } = mount();

      view.update(model({ announcement: 'hello world' }));
      const live = q.getByTestId('terminal-announcement');
      expect(live).toHaveTextContent('hello world');

      view.update(model({ announcement: 'hello world' }));
      expect(live.textContent).toBe('\nhello world');
    });
  });
});
