import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Heading } from '@/utils/extractHeadings';
import { Outline } from './Outline';
import styles from './Outline.module.css';

const headings: Heading[] = [
  { level: 2, text: 'Overview', id: 'overview' },
  { level: 3, text: 'Details', id: 'details' },
  { level: 2, text: 'Summary', id: 'summary' },
];

function renderOutline(overrides: Partial<Parameters<typeof Outline>[0]> = {}) {
  const props = {
    id: 'lesson-outline',
    headings,
    open: true,
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<Outline {...props} />), props };
}

describe('Outline', () => {
  it('should render nothing when there are no headings', () => {
    renderOutline({ headings: [] });
    expect(screen.queryByRole('navigation', { name: 'Lesson outline' })).toBeNull();
  });

  it('should render a sidebar nav landmark with all heading links when open', () => {
    renderOutline({ open: true });

    expect(screen.getByRole('navigation', { name: 'Lesson outline' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Summary' })).toBeInTheDocument();
  });

  it('should include the open class on the sidebar nav when open is true', () => {
    renderOutline({ open: true });
    expect(screen.getByRole('navigation', { name: 'Lesson outline' })).toHaveClass(
      styles['sidebar-open']
    );
  });

  it('should not include the open class on the sidebar nav when open is false', () => {
    renderOutline({ open: false });
    expect(screen.getByRole('navigation', { name: 'Lesson outline' })).not.toHaveClass(
      styles['sidebar-open']
    );
  });

  it('should link each heading to its anchor', () => {
    renderOutline();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '#overview');
    expect(screen.getByRole('link', { name: 'Details' })).toHaveAttribute('href', '#details');
  });

  it('should not call onClose when a link is clicked on desktop', async () => {
    // The matchMedia mock in setup.ts simulates a desktop viewport (min-width
    // queries match). On desktop the sidebar is a persistent panel, not a
    // drawer, so link clicks must not close it.
    const user = userEvent.setup();
    const { props } = renderOutline();

    await user.click(screen.getByRole('link', { name: 'Overview' }));
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('should keep a nested heading active when its parent leaves the detection zone', () => {
    let callback: IntersectionObserverCallback | undefined;

    class TestIntersectionObserver {
      constructor(observerCallback: IntersectionObserverCallback) {
        callback = observerCallback;
      }

      observe() {}
      disconnect() {}
    }

    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);
    renderOutline();

    const overview = screen.getByRole('link', { name: 'Overview' });
    const details = screen.getByRole('link', { name: 'Details' });
    const overviewHeading = document.createElement('h2');
    overviewHeading.id = 'overview';
    const detailsHeading = document.createElement('h3');
    detailsHeading.id = 'details';
    const createEntry = (
      target: Element,
      isIntersecting: boolean,
      top: number
    ): IntersectionObserverEntry => ({
      boundingClientRect: { top } as DOMRectReadOnly,
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: { top } as DOMRectReadOnly,
      isIntersecting,
      rootBounds: null,
      target,
      time: 0,
    });

    act(() => {
      callback?.(
        [createEntry(overviewHeading, true, 100), createEntry(detailsHeading, true, 120)],
        {} as IntersectionObserver
      );
    });
    expect(overview).toHaveAttribute('aria-current', 'location');

    act(() => {
      callback?.([createEntry(overviewHeading, false, 50)], {} as IntersectionObserver);
    });

    expect(details).toHaveAttribute('aria-current', 'location');
    expect(overview).not.toHaveAttribute('aria-current', 'location');
  });
});
