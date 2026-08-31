import { KbdCombo } from '@/components/base/KbdCombo/KbdCombo';
import { Modal } from '@/components/base/Modal/Modal';
import { useShortcutsPreference } from '@/hooks/useShortcutsPreference';
import styles from './ShortcutsModal.module.css';

export interface ShortcutsModalProps {
  /** Whether the modal is shown. Owned by the parent (header button). */
  open: boolean;
  /** Close the modal; the parent flips `open` to false. */
  onClose: () => void;
  /** Element to restore focus to on close. Forwarded to Modal. */
  triggerElement?: HTMLElement | null;
}

interface Shortcut {
  /** Ordered key labels rendered as separate <kbd> chips. */
  keys: string[];
  action: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['Alt', '/'], action: 'show keyboard shortcuts dialog' },
  { keys: ['Alt', '1'], action: 'focus instructions' },
  { keys: ['Alt', '2'], action: 'focus terminal' },
  { keys: ['Alt', 'N'], action: 'next lesson' },
  { keys: ['Alt', 'P'], action: 'previous lesson' },
  { keys: ['Alt', 'M'], action: 'open lesson list' },
  { keys: ['Cmd', 'Enter'], action: 'run all checks / advance' },
];

export function ShortcutsModal({ open, onClose, triggerElement }: ShortcutsModalProps) {
  const { shortcutsEnabled } = useShortcutsPreference();

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="close shortcuts"
      ariaLabelledBy="shortcuts-modal-title"
      panelClassName={styles.panel}
      triggerElement={triggerElement}
    >
      <Modal.Header id="shortcuts-modal-title">Keyboard shortcuts</Modal.Header>

      <Modal.Body>
        <p className={styles.notice}>
          {shortcutsEnabled
            ? 'The following keyboard shortcuts are enabled.'
            : 'These shortcuts are currently off. You can enable them in the settings dialog.'}
        </p>
        <dl className={styles.list}>
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.action} className={styles.row}>
              <dt className={styles.keys}>
                <KbdCombo keys={shortcut.keys} separateAll />
              </dt>
              <dd className={styles.action}>{shortcut.action}</dd>
            </div>
          ))}
        </dl>
      </Modal.Body>
    </Modal>
  );
}
