/* eslint-disable testing-library/no-node-access */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeoMeta } from './useSeoMeta';

vi.mock('@/utils/seo.config', () => ({
  seoConfig: {
    siteUrl: 'https://vim.example.com',
    siteName: 'Vim Course',
    siteTitle: 'Vim Course | freeCodeCamp.org',
    siteDescription: 'A site-level description.',
    keywords: 'freeCodeCamp',
    ogImage: 'https://cdn.freecodecamp.org/platform/universal/fcc_meta_1920X1080-indigo.png',
    ogImageWidth: '1920',
    ogImageHeight: '1080',
    ogType: 'website',
    twitterHandle: '@freecodecamp',
    twitterCard: 'summary_large_image',
    articlePublisher: 'https://www.facebook.com/freecodecamp',
    referrer: 'no-referrer-when-downgrade',
    publisherName: 'freeCodeCamp.org',
    publisherLogoUrl: 'https://cdn.freecodecamp.org/platform/universal/fcc_primary.svg',
    publisherLogoWidth: '2100',
    publisherLogoHeight: '240',
  },
}));

const MOCK_SITE_URL = 'https://vim.example.com';
const MOCK_SITE_NAME = 'Vim Course';

function getMeta(selector: string, attr = 'name') {
  return document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${selector}"]`);
}

function getLink(rel: string) {
  return document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
}

beforeEach(() => {
  document.head.querySelectorAll('meta[name], meta[property], link[rel="canonical"]').forEach((el) => {
    el.remove();
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useSeoMeta', () => {
  describe('with title, description, and all config fields set', () => {
    it('should render meta description with the per-page description', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.', path: '/test' })
      );

      expect(getMeta('description')?.content).toBe('A test description.');
    });

    it('should render og:description with the per-page description', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.', path: '/test' })
      );

      expect(getMeta('og:description', 'property')?.content).toBe('A test description.');
    });

    it('should render twitter:description with the per-page description', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.', path: '/test' })
      );

      expect(getMeta('twitter:description')?.content).toBe('A test description.');
    });

    it('should render og:title with the page title', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.', path: '/test' })
      );

      expect(getMeta('og:title', 'property')?.content).toBe('Test Page | Vim Course');
    });

    it('should render twitter:title with the page title', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.', path: '/test' })
      );

      expect(getMeta('twitter:title')?.content).toBe('Test Page | Vim Course');
    });

    it('should render og:site_name when siteName is set', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.', path: '/test' })
      );

      expect(getMeta('og:site_name', 'property')?.content).toBe(MOCK_SITE_NAME);
    });

    it('should render a valid absolute canonical URL containing the page path', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.', path: '/test' })
      );

      const canonical = getLink('canonical');
      expect(canonical).not.toBeNull();
      expect(canonical?.href).toMatch(/^https?:\/\//);
      expect(canonical?.href).toContain('/test');
    });

    it('should render og:url as a valid absolute URL containing the page path', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.', path: '/test' })
      );

      const ogUrl = getMeta('og:url', 'property');
      expect(ogUrl?.content).toBe(`${MOCK_SITE_URL}/test`);
    });
  });

  describe('when description is not provided', () => {
    it('should not render meta description', () => {
      renderHook(() => useSeoMeta({ title: 'Test Page | Vim Course' }));

      expect(getMeta('description')).toBeNull();
    });

    it('should not render og:description', () => {
      renderHook(() => useSeoMeta({ title: 'Test Page | Vim Course' }));

      expect(getMeta('og:description', 'property')).toBeNull();
    });

    it('should not render twitter:description', () => {
      renderHook(() => useSeoMeta({ title: 'Test Page | Vim Course' }));

      expect(getMeta('twitter:description')).toBeNull();
    });
  });

  describe('when path is not provided', () => {
    it('should not render a canonical link', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.' })
      );

      expect(getLink('canonical')).toBeNull();
    });

    it('should not render og:url', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.' })
      );

      expect(getMeta('og:url', 'property')).toBeNull();
    });

    it('should not render twitter:url', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.' })
      );

      expect(getMeta('twitter:url')).toBeNull();
    });
  });

  describe('no empty content attributes', () => {
    it('should not render any meta tag with an empty content attribute', () => {
      renderHook(() =>
        useSeoMeta({ title: 'Test Page | Vim Course', description: 'A test description.', path: '/test' })
      );

      document.head.querySelectorAll('meta').forEach((el) => {
        expect(el.content).not.toBe('');
      });
    });
  });
});
