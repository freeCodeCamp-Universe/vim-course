import { useEffect, useRef } from 'react';
import { useAltKeyName, useAltLabel } from '@/hooks/usePlatformModifier';
import styles from './CurriculumSearch.module.css';

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
  width: 'half' | 'full';
}

export function CurriculumSearch({ query, onQueryChange, width }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const altLabel = useAltLabel();
  const altKeyName = useAltKeyName();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (event.code !== 'KeyK') {
        return;
      }
      const input = inputRef.current;
      if (!input || document.activeElement === input) {
        return;
      }
      event.preventDefault();
      input.focus();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className={`${styles.search} ${styles[width]}`}>
      <label className={styles.field}>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search lessons by title or ID"
          aria-label="Search lessons by title or ID"
          aria-keyshortcuts={`${altKeyName}+K`}
        />
        <span className={styles.hint} aria-hidden="true">
          <span className={styles['hint-key']}>{altLabel}</span>
          <span className={styles['hint-key']}>K</span>
        </span>
      </label>
    </div>
  );
}
