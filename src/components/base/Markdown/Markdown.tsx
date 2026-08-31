import { marked } from 'marked';
import { useRef } from 'react';
import { useCodeBlockCopy } from '@/components/base/CodeBlockCopy';
import { slugify } from '@/utils/extractHeadings';
import styles from './Markdown.module.css';

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character
  );
}

marked.use({
  renderer: {
    heading(token) {
      const text = this.parser.parseInline(token.tokens);
      if (token.depth === 2 || token.depth === 3) {
        const id = slugify(token.text);
        return `<h${token.depth} id="${id}">${text}</h${token.depth}>\n`;
      }
      return `<h${token.depth}>${text}</h${token.depth}>\n`;
    },
    code({ text, lang }) {
      const raw = lang ?? '';
      const infoTokens = raw.split(/\s+/).filter(Boolean);
      const hasCopy = infoTokens.includes('copy');
      const language = infoTokens.find((token) => token !== 'copy' && token !== 'no-copy') ?? '';
      const langClass = language ? ` class="language-${escapeHtml(language)}"` : '';
      const copyAttr = hasCopy ? ' data-copy' : '';
      return `<pre${copyAttr}><code${langClass}>${escapeHtml(text)}</code></pre>`;
    },
    link(token) {
      const href = escapeHtml(token.href);
      const title = token.title ? ` title="${escapeHtml(token.title)}"` : '';
      const text = this.parser.parseInline(token.tokens);
      return `<a href="${href}"${title} target="_blank" rel="nofollow noopener noreferrer">${text}</a>`;
    },
    tablecell(token) {
      const tag = token.header ? 'th' : 'td';
      const cls = token.align ? ` class="${styles[`align-${token.align}`]}"` : '';
      const inner = this.parser.parseInline(token.tokens);
      return `<${tag}${cls}>${inner}</${tag}>\n`;
    },
  },
});

export interface MarkdownProps {
  /** The raw markdown source (a lesson's `# --instructions--` body). */
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  const proseRef = useRef<HTMLDivElement>(null);
  useCodeBlockCopy(proseRef);

  const html = (
    marked.parse(children, {
      async: false,
      breaks: false,
      gfm: true,
    }) as string
  )
    .replaceAll('<table>', `<div class="${styles['table-wrapper']}"><table>`)
    .replaceAll('</table>', '</table></div>');

  // Lesson markdown is author-controlled curriculum content loaded from this repository.
  return <div ref={proseRef} className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />;
}
