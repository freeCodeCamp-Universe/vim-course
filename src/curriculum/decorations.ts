export interface DecorationRange {
  line: number;
  startCol: number;
  endCol: number;
}

export function extractDecorations(raw: string): {
  text: string;
  ranges: DecorationRange[];
} {
  const ranges: DecorationRange[] = [];
  const cleanLines = raw.split('\n').map((line, lineIndex) => {
    let cleanLine = '';
    let cleanCol = 0;

    for (let index = 0; index < line.length;) {
      if (line[index] === '\\' && line[index + 1] === '$' && line[index + 2] === '{') {
        cleanLine += '${';
        cleanCol += 2;
        index += 3;
        continue;
      }

      if (line[index] === '$' && line[index + 1] === '{') {
        const closingBrace = line.indexOf('}', index + 2);

        if (closingBrace !== -1) {
          const inner = line.slice(index + 2, closingBrace);
          cleanLine += inner;
          cleanCol += inner.length;

          if (inner.length > 0) {
            ranges.push({
              line: lineIndex,
              startCol: cleanCol - inner.length,
              endCol: cleanCol,
            });
          }

          index = closingBrace + 1;
          continue;
        }

        cleanLine += '${';
        cleanCol += 2;
        index += 2;
        continue;
      }

      cleanLine += line[index];
      cleanCol += 1;
      index += 1;
    }

    return cleanLine;
  });

  return { text: cleanLines.join('\n'), ranges };
}
