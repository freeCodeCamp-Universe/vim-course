import type { ButtonHTMLAttributes, Ref } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'danger' | 'cta';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant;
  borderless?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant, borderless = false, className, ref, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      ref={ref}
      className={[
        styles.button,
        styles[variant],
        borderless ? styles.borderless : undefined,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
