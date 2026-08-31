import { GearIcon, KeyboardIcon, ListIcon } from '@/components/base/Icon';
import { useCourseChrome } from '@/stores/courseChrome';
import { DonateButton } from './DonateButton';
import styles from './HeaderControls.module.css';

interface HeaderControlsProps {
  showDrawer?: boolean;
  showShortcuts?: boolean;
}

export function HeaderControls({ showDrawer = true, showShortcuts = true }: HeaderControlsProps) {
  const { openDrawer, openShortcuts, openSettings } = useCourseChrome();

  return (
    <div className={styles.actions}>
      {showDrawer && (
        <button
          type="button"
          className={styles.action}
          onClick={openDrawer}
          aria-label="open lessons"
        >
          <ListIcon />
        </button>
      )}
      {showShortcuts && (
        <button
          type="button"
          className={`${styles.action} ${styles['action-keyboard-only']}`}
          onClick={openShortcuts}
          aria-label="keyboard shortcuts"
        >
          <KeyboardIcon />
        </button>
      )}
      <button type="button" className={styles.action} onClick={openSettings} aria-label="settings">
        <GearIcon />
      </button>
      <DonateButton />
    </div>
  );
}
