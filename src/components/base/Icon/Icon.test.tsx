import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  CheckLgIcon,
  ClipboardIcon,
  CircleIcon,
  FccLogoIcon,
  GearIcon,
  KeyboardIcon,
  ListIcon,
  MoonIcon,
  SunIcon,
  XCircleIcon,
  XIcon,
} from './index';

const icons = [
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  CheckLgIcon,
  ClipboardIcon,
  CircleIcon,
  FccLogoIcon,
  GearIcon,
  KeyboardIcon,
  ListIcon,
  MoonIcon,
  SunIcon,
  XCircleIcon,
  XIcon,
];

describe('Icon components', () => {
  it.each(icons)('should render %s as an aria-hidden SVG', (Icon) => {
    render(<Icon />);

    expect(screen.getByRole('img', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });
});
