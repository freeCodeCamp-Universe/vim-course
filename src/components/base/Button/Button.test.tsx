import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import styles from './Button.module.css';
import { Button } from './Button';

describe('Button', () => {
  it('should apply the selected variant and custom class', () => {
    render(
      <Button variant="primary" className="custom-class">
        Continue
      </Button>
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toHaveClass(
      styles.button,
      styles.primary,
      'custom-class'
    );
  });

  it('should pass through native button props', () => {
    render(
      <Button variant="danger" disabled>
        Reset
      </Button>
    );

    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('should apply borderless styling when requested', () => {
    render(
      <Button variant="danger" borderless>
        Reset
      </Button>
    );

    expect(screen.getByRole('button', { name: 'Reset' })).toHaveClass(styles.borderless);
  });

  it('should default the button type to "button"', () => {
    render(<Button variant="primary">Submit</Button>);

    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'button');
  });

  it('should render a link when href is provided', () => {
    render(
      <Button variant="cta" href="https://example.com" target="_blank" rel="noopener noreferrer">
        Donate
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Donate' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass(styles.button, styles.cta);
  });
});
