import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import styles from './Link.module.css';
import { Link } from './Link';

describe('Link', () => {
  it('should apply link styling and pass through anchor props', () => {
    render(
      <Link href="https://www.freecodecamp.org" target="_blank" rel="noopener noreferrer">
        freeCodeCamp
      </Link>
    );

    const link = screen.getByRole('link', { name: 'freeCodeCamp' });
    expect(link).toHaveClass(styles.link);
    expect(link).toHaveAttribute('href', 'https://www.freecodecamp.org');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
