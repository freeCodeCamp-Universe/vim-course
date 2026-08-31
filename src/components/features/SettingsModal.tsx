import { Modal } from '@/components/base/Modal/Modal';
import { Switch } from '@/components/base/Switch/Switch';
import { useAnimationsPreference } from '@/hooks/useAnimationsPreference';
import { useInitialFocusPreference } from '@/hooks/useInitialFocusPreference';
import { useShortcutsPreference } from '@/hooks/useShortcutsPreference';
import { useTheme } from '@/hooks/useTheme';
import styles from './SettingsModal.module.css';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  /** Element to restore focus to on close. Forwarded to Modal. */
  triggerElement?: HTMLElement | null;
}

export function SettingsModal({ open, onClose, triggerElement }: SettingsModalProps) {
  const { animationsEnabled, setAnimationsEnabled } = useAnimationsPreference();
  const { focusInstructionsOnLoad, setFocusInstructionsOnLoad } = useInitialFocusPreference();
  const { shortcutsEnabled, setShortcutsEnabled } = useShortcutsPreference();
  const { isDark, toggleTheme } = useTheme();

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeLabel="close settings"
      ariaLabelledBy="settings-modal-title"
      panelClassName={styles.panel}
      triggerElement={triggerElement}
    >
      <Modal.Header id="settings-modal-title">Settings</Modal.Header>
      <Modal.Body>
        <Switch
          checked={isDark}
          onChange={() => toggleTheme()}
          label="Enable dark theme"
          labelPosition="end"
          description="When on, the dark theme is used."
        />
        <div className={styles['setting-keyboard-only']}>
          <Switch
            checked={shortcutsEnabled}
            onChange={setShortcutsEnabled}
            label="Enable keyboard shortcuts"
            labelPosition="end"
            description="When on, keyboard shortcuts are active."
          />
        </div>
        <Switch
          checked={focusInstructionsOnLoad}
          onChange={setFocusInstructionsOnLoad}
          label="Focus the instructions panel when a lesson starts"
          labelPosition="end"
          description="When on, the instructions panel is automatically focused when a lesson starts instead of the terminal."
        />
        <Switch
          checked={animationsEnabled}
          onChange={setAnimationsEnabled}
          label="Enable animations"
          description="When on, animations and transitions are applied."
        />
      </Modal.Body>
    </Modal>
  );
}
