import { describe, expect, it } from 'vitest';
import { seoConfig } from './seo.config';

describe('seoConfig', () => {
  it('should use the freeCodeCamp OG image URL', () => {
    expect(seoConfig.ogImage).toBe(
      'https://cdn.freecodecamp.org/platform/universal/fcc_meta_1920X1080-indigo.png'
    );
  });

  it('should use the freeCodeCamp Twitter handle', () => {
    expect(seoConfig.twitterHandle).toBe('@freecodecamp');
  });

  it('should use the freeCodeCamp publisher logo URL', () => {
    expect(seoConfig.publisherLogoUrl).toBe(
      'https://cdn.freecodecamp.org/platform/universal/fcc_primary.svg'
    );
  });

  it('should use the freeCodeCamp Facebook article publisher URL', () => {
    expect(seoConfig.articlePublisher).toBe('https://www.facebook.com/freecodecamp');
  });

  it('should use the correct OG image dimensions', () => {
    expect(seoConfig.ogImageWidth).toBe('1920');
    expect(seoConfig.ogImageHeight).toBe('1080');
  });

  it('should use the correct publisher logo dimensions', () => {
    expect(seoConfig.publisherLogoWidth).toBe('2100');
    expect(seoConfig.publisherLogoHeight).toBe('240');
  });

  it('should set twitterCard to summary_large_image', () => {
    expect(seoConfig.twitterCard).toBe('summary_large_image');
  });

  it('should set ogType to website', () => {
    expect(seoConfig.ogType).toBe('website');
  });

  it('should set referrer to no-referrer-when-downgrade', () => {
    expect(seoConfig.referrer).toBe('no-referrer-when-downgrade');
  });

  it('should set publisherName to freeCodeCamp.org', () => {
    expect(seoConfig.publisherName).toBe('freeCodeCamp.org');
  });

  it('should have keywords starting with freeCodeCamp', () => {
    expect(seoConfig.keywords).toMatch(/^freeCodeCamp/);
  });

  it('should have a siteTitle', () => {
    expect(seoConfig.siteTitle).toBe('Vim Course | freeCodeCamp.org');
  });

  it('should have a siteDescription', () => {
    expect(seoConfig.siteDescription).toBeTruthy();
  });
});
