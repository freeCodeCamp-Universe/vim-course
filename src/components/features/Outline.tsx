import { useEffect, useState } from 'react';
import type { Heading } from '@/utils/extractHeadings';
import { Drawer } from '@/components/base/Drawer/Drawer';
import styles from './Outline.module.css';

export interface OutlineProps {
  /** Must match the `aria-controls` value on the Outline toolbar button. */
  id: string;
  headings: Heading[];
  /** Whether the outline is open. Controls the mobile Drawer and the desktop sidebar. */
  open: boolean;
  /** Called when the outline should close (link click, Drawer close button). */
  onClose: () => void;
  /** Element to restore focus to when the mobile Drawer closes. */
  triggerElement?: HTMLElement | null;
}

/**
 * Detects desktop (≥1024px) after mount. Defaults to true (desktop) during SSR
 * so the Drawer never opens server-side or during initial hydration.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

/**
 * Tracks which heading is currently most prominent in the viewport. Uses
 * IntersectionObserver scoped to the top portion of the viewport so that the
 * active link follows the reader's position in the prose content.
 *
 * Returns a tuple of [activeId, setActiveId] so callers can also set the
 * active heading immediately on link click without waiting for scroll events.
 */
function useActiveHeading(headings: Heading[]): [string | null, (id: string) => void] {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!headings.length) {
      return;
    }

    const intersecting = new Map<Element, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            intersecting.set(entry.target, entry);
          } else {
            intersecting.delete(entry.target);
          }
        }

        const visible = [...intersecting.values()].sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        );
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      // Detection zone: from 15% down from the top to 50% up from the bottom.
      // The wider top margin excludes headings that have just barely scrolled
      // above the content area, preventing the parent h2 from staying "active"
      // after the reader has scrolled to a child h3.
      { rootMargin: '-15% 0px -50% 0px' }
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [headings]);

  return [activeId, setActiveId];
}

export function Outline({ id, headings, open, onClose, triggerElement }: OutlineProps) {
  const isDesktop = useIsDesktop();
  const [activeId, setActiveId] = useActiveHeading(headings);

  // Modal (used by Drawer) calls document.createElement in a useState initializer
  // which crashes during SSR. Guard the Drawer so it is never in the tree until
  // after the component has mounted on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!headings.length) {
    return null;
  }

  // Set the active heading immediately on click so the highlight responds
  // without waiting for the IntersectionObserver scroll detection. On mobile
  // (Drawer), also call onClose to dismiss the panel. On desktop, the sidebar
  // stays open — the Outline button controls its visibility.
  const handleLinkClick = (headingId: string) => {
    setActiveId(headingId);
    if (!isDesktop) {
      onClose();
    }
  };

  const list = (
    <ol className={styles.list}>
      {headings.map(({ level, text, id: headingId }) => (
        <li key={headingId} className={level === 3 ? styles['item-h3'] : styles['item-h2']}>
          <a
            href={`#${headingId}`}
            className={`${styles.link}${activeId === headingId ? ` ${styles['link-active']}` : ''}`}
            aria-current={activeId === headingId ? 'location' : undefined}
            onClick={() => handleLinkClick(headingId)}
          >
            {text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      {/* Mobile: slide-in drawer. Not rendered until after mount (Modal.tsx
          calls document.createElement in a useState initializer which crashes
          during SSR). Kept closed on desktop via the isDesktop guard. */}
      {mounted && (
        <Drawer
          open={!isDesktop && open}
          onClose={onClose}
          title="Outline"
          triggerElement={triggerElement}
        >
          <Drawer.Body>{list}</Drawer.Body>
        </Drawer>
      )}

      {/* Desktop: toggleable sidebar. CSS hides it on mobile entirely. */}
      <nav
        id={id}
        className={`${styles.sidebar}${open ? ` ${styles['sidebar-open']}` : ''}`}
        aria-label="Lesson outline"
      >
        {list}
      </nav>
    </>
  );
}
