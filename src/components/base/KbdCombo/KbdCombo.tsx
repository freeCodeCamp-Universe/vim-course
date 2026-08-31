import { useAltLabel, useCmdLabel } from '@/hooks/usePlatformModifier';
import styles from './KbdCombo.module.css';

export interface KbdComboProps {
  /** Ordered key labels. 'Alt' resolves to the platform alt label; 'Cmd' to the platform modifier. */
  keys: string[];
  /** Extra class applied to the wrapper span for context-specific overrides. */
  className?: string;
  /**
   * When true, always render a `+` separator between keys, even when the
   * preceding key is a non-ASCII symbol. Use in contexts like the shortcuts
   * modal where the chips must always be visually separated.
   */
  separateAll?: boolean;
}

/** A non-ASCII symbol key (e.g. ⌥, ⌘) runs directly into the next key with no separator. */
function isSymbolKey(resolved: string): boolean {
  return resolved.length === 1 && resolved.charCodeAt(0) > 127;
}

/**
 * Renders an inline keyboard shortcut as a row of `<kbd>` chips joined by `+` separators,
 * except when the preceding key is a single non-ASCII symbol (⌥, ⌘) — those run
 * together without a separator, matching macOS convention. Resolves 'Alt' and 'Cmd'
 * to platform-specific labels. Hidden below 1024px; present only as a visual hint,
 * so the wrapper is `aria-hidden`.
 */
export function KbdCombo({ keys, className, separateAll = false }: KbdComboProps) {
  const altLabel = useAltLabel();
  const cmdLabel = useCmdLabel();

  function resolveKey(key: string): string {
    if (key === 'Alt') {
      return altLabel;
    }
    if (key === 'Cmd') {
      return cmdLabel;
    }
    return key;
  }

  const resolved = keys.map(resolveKey);

  return (
    <span
      className={`${styles.combo}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      data-testid="kbd-combo"
    >
      {resolved.map((label, index) => (
        <span key={keys[index]}>
          {index > 0 && (separateAll || !isSymbolKey(resolved[index - 1])) ? (
            <span className={styles.plus}>+</span>
          ) : null}
          <kbd
            className={
              [
                label.length === 1 ? styles['kbd-square'] : undefined,
                isSymbolKey(label) ? styles['kbd-symbol'] : undefined,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
          >
            {label}
          </kbd>
        </span>
      ))}
    </span>
  );
}
