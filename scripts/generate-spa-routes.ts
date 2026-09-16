/**
 * Post-build script: generates per-route index.html files with correct SEO meta
 * tags so crawlers and social-link-preview bots see the right title, description,
 * and canonical URL without executing JavaScript.
 *
 * Uses dist/index.html as a template (it contains a `<!-- SEO_META_PLACEHOLDER -->`
 * comment). For each route the script replaces the placeholder with the
 * fully-rendered meta block and writes the result to the appropriate path.
 *
 * Run after `vite build`:
 *   node --import tsx/esm scripts/generate-spa-routes.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { seoConfig } from '../src/utils/seo.config';

const projectRoot = resolve(import.meta.dirname, '..');
const distDir = join(projectRoot, 'dist');

const treePath = join(distDir, 'data', 'curriculum-tree.json');
const tree = JSON.parse(readFileSync(treePath, 'utf-8'));

const template = readFileSync(join(distDir, 'index.html'), 'utf-8');

interface LessonEntry {
  id: string;
  title: string;
  dataFile: string;
}

interface RouteMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  jsonLdType: 'WebSite' | 'WebPage';
}

function buildJsonLd({ title, description, canonicalPath, jsonLdType }: RouteMetadata): string {
  const canonicalUrl = `${seoConfig.siteUrl}${canonicalPath}`;

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': jsonLdType,
    name: title,
    url: canonicalUrl,
    description,
    publisher: {
      '@type': 'Organization',
      name: seoConfig.publisherName,
      url: seoConfig.siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: seoConfig.publisherLogoUrl,
        width: Number(seoConfig.publisherLogoWidth),
        height: Number(seoConfig.publisherLogoHeight),
      },
    },
    image: {
      '@type': 'ImageObject',
      url: seoConfig.ogImage,
      width: Number(seoConfig.ogImageWidth),
      height: Number(seoConfig.ogImageHeight),
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  };

  return `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

function buildMetaBlock(meta: RouteMetadata): string {
  const canonicalUrl = `${seoConfig.siteUrl}${meta.canonicalPath}`;

  const lines = [
    `<title>${meta.title}</title>`,
    `<meta name="description" content="${meta.description}" />`,
    `<meta name="keywords" content="${seoConfig.keywords}" />`,
    `<meta name="referrer" content="${seoConfig.referrer}" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<meta property="og:type" content="${seoConfig.ogType}" />`,
    `<meta property="og:title" content="${meta.title}" />`,
    `<meta property="og:description" content="${meta.description}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:site_name" content="${seoConfig.siteName}" />`,
    `<meta property="og:image" content="${seoConfig.ogImage}" />`,
    `<meta property="og:image:width" content="${seoConfig.ogImageWidth}" />`,
    `<meta property="og:image:height" content="${seoConfig.ogImageHeight}" />`,
    `<meta property="article:publisher" content="${seoConfig.articlePublisher}" />`,
    `<meta name="twitter:card" content="${seoConfig.twitterCard}" />`,
    `<meta name="twitter:site" content="${seoConfig.twitterHandle}" />`,
    `<meta name="twitter:title" content="${meta.title}" />`,
    `<meta name="twitter:description" content="${meta.description}" />`,
    `<meta name="twitter:image" content="${seoConfig.ogImage}" />`,
    buildJsonLd(meta),
  ];

  return lines.join('\n    ');
}

function renderRoute(meta: RouteMetadata): string {
  const metaBlock = buildMetaBlock(meta);
  return template
    .replace(`<title>${seoConfig.siteTitle}</title>`, '')
    .replace('<!-- SEO_META_PLACEHOLDER -->', metaBlock);
}

// Homepage
const homepageHtml = renderRoute({
  title: seoConfig.siteTitle,
  description: seoConfig.siteDescription,
  canonicalPath: '/',
  jsonLdType: 'WebSite',
});
writeFileSync(join(distDir, 'index.html'), homepageHtml);

// Lesson pages
const lessons: LessonEntry[] = tree.modules.flatMap(
  (m: { lessons: LessonEntry[] }) => m.lessons
);

for (const lesson of lessons) {
  const cleanTitle = lesson.title.replaceAll('`', '');
  const pageTitle = `${cleanTitle} | ${seoConfig.siteTitle}`;

  const html = renderRoute({
    title: pageTitle,
    description: seoConfig.siteDescription,
    canonicalPath: `/learn/${lesson.id}`,
    jsonLdType: 'WebPage',
  });

  const dir = join(distDir, 'learn', lesson.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}

console.log(
  `Generated SEO meta for ${lessons.length + 1} routes (1 homepage + ${lessons.length} lessons)`
);
