/* eslint-disable testing-library/no-node-access */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProseLessonDefinition } from '@/curriculum/types';
import { seoConfig } from '@/utils/seo.config';
import { LessonPage } from './LessonPage';

vi.mock('@/components/features/LessonToolbar', () => ({
  LessonToolbar: () => null,
}));

vi.mock('@/components/features/Outline', () => ({
  Outline: () => null,
}));

vi.mock('./LessonWorkspace', () => ({
  LessonWorkspace: () => null,
}));

const lesson: ProseLessonDefinition = {
  id: 'intro',
  module: 1,
  lesson: 1,
  title: 'Getting started with `Vim`',
  type: 'learn',
  instructions: 'Learn the basics.',
};

const expectedTitle = `Getting started with Vim | ${seoConfig.siteTitle}`;

afterEach(() => {
  document.head.querySelectorAll('meta[name], meta[property]').forEach((el) => el.remove());
});

describe('LessonPage', () => {
  it('should set the document title from the lesson title', () => {
    render(<LessonPage lesson={lesson} isLastLesson={false} instructionsHtml="" headings={[]} />);

    expect(document.title).toBe(expectedTitle);
  });

  it('should set og:title and twitter:title from the lesson title', () => {
    render(<LessonPage lesson={lesson} isLastLesson={false} instructionsHtml="" headings={[]} />);

    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(expectedTitle);
    expect(document.head.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(expectedTitle);
  });

  it('should set the shared site description', () => {
    render(<LessonPage lesson={lesson} isLastLesson={false} instructionsHtml="" headings={[]} />);

    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(seoConfig.siteDescription);
    expect(document.head.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(seoConfig.siteDescription);
    expect(document.head.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe(seoConfig.siteDescription);
  });

  it('should set a lesson-specific canonical URL', () => {
    render(<LessonPage lesson={lesson} isLastLesson={false} instructionsHtml="" headings={[]} />);

    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toContain(
      '/learn/intro'
    );
  });
});
