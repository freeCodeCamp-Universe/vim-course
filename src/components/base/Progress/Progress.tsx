import styles from './Progress.module.css';

export interface ProgressProps {
  completed: number;
  total: number;
}

export function Progress({ completed, total }: ProgressProps) {
  return (
    <p className={styles.progress} data-progress data-progress-total={total}>
      <span aria-hidden="true" data-progress-visible>
        {completed}/{total} lessons completed
      </span>
      <span className="sr-only" data-progress-sr>
        {completed} out of {total} lessons completed
      </span>
    </p>
  );
}
