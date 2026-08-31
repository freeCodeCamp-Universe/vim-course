import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('should render headings at their markdown level', () => {
    render(<Markdown>{'## Modes\n\n### Insert'}</Markdown>);

    expect(screen.getByRole('heading', { level: 2, name: 'Modes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Insert' })).toBeInTheDocument();
  });

  it('should add slug IDs to H2 and H3 headings', () => {
    render(<Markdown>{'## Hello World\n\n### The `x` Command'}</Markdown>);

    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'hello-world');
    expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('id', 'the-x-command');
  });

  it('should render an unordered list as list items', () => {
    render(<Markdown>{'- first\n- second'}</Markdown>);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('first');
    expect(items[1]).toHaveTextContent('second');
  });

  it('should render inline bold and code spans', () => {
    render(<Markdown>{'Press **Esc** then type `:w`'}</Markdown>);

    expect(screen.getByText('Esc').tagName).toBe('STRONG');
    expect(screen.getByText(':w').tagName).toBe('CODE');
  });

  it('should keep a fenced code block intact across its blank lines', () => {
    render(<Markdown>{'```\nline one\n\nline two\n```'}</Markdown>);

    expect(screen.getByText(/line one/)).toBeInTheDocument();
    expect(screen.getByText(/line two/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Copy code to clipboard' })
    ).not.toBeInTheDocument();
  });

  it('should render a copy button only when the fence uses the copy marker', () => {
    render(<Markdown>{'```js copy\nconst value = 1;\n```'}</Markdown>);

    expect(screen.getByRole('button', { name: 'Copy code to clipboard' })).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- language class has no semantic query equivalent
    expect(document.querySelector('code.language-js')).toBeInTheDocument();
  });

  it('should preserve no-copy as an ordinary annotation without enabling copying', () => {
    render(<Markdown>{'```txt no-copy\nNo button.\n```'}</Markdown>);

    expect(
      screen.queryByRole('button', { name: 'Copy code to clipboard' })
    ).not.toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- language class has no semantic query equivalent
    expect(document.querySelector('code.language-txt')).toBeInTheDocument();
  });

  it('should render links with target blank and nofollow attributes', () => {
    render(<Markdown>{'[Vim docs](https://vimhelp.org)'}</Markdown>);

    const link = screen.getByRole('link', { name: 'Vim docs' });
    expect(link).toHaveAttribute('href', 'https://vimhelp.org');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
  });

  it('should render links with a title attribute when one is provided', () => {
    render(<Markdown>{'[Vim docs](https://vimhelp.org "Vim reference")'}</Markdown>);

    const link = screen.getByRole('link', { name: 'Vim docs' });
    expect(link).toHaveAttribute('title', 'Vim reference');
  });

  it('should render table headers and cells', () => {
    render(<Markdown>{'| Command | Mode |\n| --- | --- |\n| `i` | Insert |'}</Markdown>);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Command' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Mode' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Insert' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'i' })).toBeInTheDocument();
  });
});
