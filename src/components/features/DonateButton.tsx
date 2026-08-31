import cfg from '../../../donation-config.json';
import styles from '../base/Button/Button.module.css';

const href = `https://donate.freecodecamp.org?source=${cfg.donationId}&campaign=test-2026&medium=web`;

export function DonateButton() {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[styles.button, styles.cta].join(' ')}
    >
      Donate
    </a>
  );
}
