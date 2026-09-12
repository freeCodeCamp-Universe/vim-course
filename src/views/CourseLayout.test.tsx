import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { CourseLayout } from './CourseLayout';

vi.mock('@/hooks/useMediaQuery');

vi.mock('@/components/features/HeaderControls', () => ({
  HeaderControls: () => null,
}));

vi.mock('@/components/features/CourseOverlays', () => ({
  CourseOverlays: () => null,
}));

function renderLayout(path: string, isTouch: boolean) {
  vi.mocked(useMediaQuery).mockReturnValue(isTouch);
  const { hook } = memoryLocation({ path, record: true });
  return render(
    <Router hook={hook}>
      <CourseLayout>
        <div />
      </CourseLayout>
    </Router>
  );
}

describe('CourseLayout', () => {
  describe('touch-device banner', () => {
    it('should show the keyboard notice on the home page on a touch device', () => {
      renderLayout('/', true);

      expect(screen.getByRole('complementary', { name: 'Notice' })).toBeInTheDocument();
    });

    it('should not show the banner on a non-touch device', () => {
      renderLayout('/', false);

      expect(screen.queryByRole('complementary', { name: 'Notice' })).toBeNull();
    });

    it('should not show the banner on a lesson page even on a touch device', () => {
      renderLayout('/learn/some-lesson', true);

      expect(screen.queryByRole('complementary', { name: 'Notice' })).toBeNull();
    });
  });
});
