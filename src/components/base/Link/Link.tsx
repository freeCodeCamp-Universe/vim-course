import type { AnchorHTMLAttributes, Ref } from 'react';
import styles from './Link.module.css';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  ref?: Ref<HTMLAnchorElement>;
}

export function Link({ children, className, ref, ...props }: LinkProps) {
  const resolvedClassName = className ? `${styles.link} ${className}` : styles.link;
  return (
    <a {...props} ref={ref} className={resolvedClassName}>
      {children}
    </a>
  );
}
