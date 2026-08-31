import { useEffect, useRef, type RefObject } from 'react';
import {
  createVimTerminalView,
  type LessonSnapshot,
  type VimTerminalView,
} from '@/terminal/vimTerminalView';
import type { LessonDefinition } from '@/curriculum/types';
import styles from './VimTerminal.module.css';

export interface VimTerminalProps {
  lesson: LessonDefinition;
  /** Receives a fresh snapshot after every advance, reset, and incomplete grade. */
  onUpdate: (snapshot: LessonSnapshot) => void;
  /** Filled with the mounted view so the workspace can focus, reset, or grade it. */
  viewRef: RefObject<VimTerminalView | null>;
  accessibleName?: string;
}

/**
 * The React seam for the framework-free terminal. It renders one empty host node
 * and never looks inside it: the view owns its own DOM, state, and repaints. The
 * effect creates the view, mounts it, and — because owning the DOM means owning
 * teardown — fully destroys it on cleanup, so StrictMode's mount → unmount → mount
 * leaves exactly one terminal with one live listener rather than two stacked.
 *
 * `onUpdate` is read through a ref so a new callback identity each render never
 * re-creates the view; only a lesson change does.
 */
export function VimTerminal({ lesson, onUpdate, viewRef, accessibleName }: VimTerminalProps) {
  const host = useRef<HTMLDivElement>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const view = createVimTerminalView({
      lesson,
      accessibleName,
      onUpdate: (snapshot) => onUpdateRef.current(snapshot),
    });
    host.current!.appendChild(view.el);
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [lesson, accessibleName, viewRef]);

  return <div ref={host} className={styles.host} />;
}
