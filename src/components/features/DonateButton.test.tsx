import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DonateButton } from './DonateButton';

describe('DonateButton', () => {
  it('should render a link with the correct donation href', () => {
    render(<DonateButton />);

    const link = screen.getByRole('link', { name: /donate/i });
    expect(link).toHaveAttribute(
      'href',
      'https://donate.freecodecamp.org?source=41478e19-73a0-4816-9a54-658b538fa1de&campaign=test-2026&medium=web'
    );
  });
});
