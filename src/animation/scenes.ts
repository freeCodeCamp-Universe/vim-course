import { centerText } from '@/terminal/centerText';

/**
 * A scene is a pure function from frame index and viewport dimensions to a
 * fixed-size array of strings. Every frame has the same row count, every row
 * is padded to the same width (`cols`), and the scene loops after `period`
 * frames. Deterministic: the same inputs always produce the same output.
 */
export type SceneFn = (frame: number, rows: number, cols: number) => string[];

export interface SceneEntry {
  fn: SceneFn;
  /** Frames before the animation loops. */
  period: number;
  /** Target frames per second. */
  fps: number;
  /** Screen-reader announcement when the scene is entered. */
  announcement?: string;
}

/** Pad every row to `cols` and ensure exactly `rows` lines. */
function normalizeFrame(lines: string[], rows: number, cols: number): string[] {
  const padded = lines.map((line) => {
    if (line.length < cols) {
      return line + ' '.repeat(cols - line.length);
    }
    return line.slice(0, cols);
  });
  while (padded.length < rows) {
    padded.push(' '.repeat(cols));
  }
  return padded.slice(0, rows);
}

/** Place text on a fixed-width line, clipping anything outside its bounds. */
function placeText(line: string, text: string, start: number): string {
  const visibleStart = Math.max(0, start);
  const textStart = Math.max(0, -start);
  const visibleText = text.slice(textStart, textStart + line.length - visibleStart);

  if (visibleText.length === 0) {
    return line;
  }

  return line.slice(0, visibleStart) + visibleText + line.slice(visibleStart + visibleText.length);
}

// Placeholder completion scene: the lesson can replace this copy without
// changing the completion trigger or animation plumbing.
const COMPLETION_PERIOD = 96;
const COMPLETION_FPS = 4;
const SPARKLE_STEP_INTERVAL = 2;
const SPARKLE_GROUPS = [
  '.⚝₊ ⁺ ⟡˚˖ . ⊹₊ ݁𓂃',
  '✮˖ . ݁₊  ݁*ੈ˖ . ݁₊ ⊹₊ ݁',
  '˚༄. ݁₊ ⊹  ݁₊ ⊹ ₊ ݁.',
  '.𖥔 ݁ .₊ ⊹˚༺ .˖ִ  𖦹',
];
const HAT_LINES = ['   ,', ' _/(_'];

function completionScene(frame: number, rows: number, cols: number): string[] {
  const animationFrame = frame % COMPLETION_PERIOD;
  const stars = Math.floor(animationFrame / 4) % 2 === 0 ? '* . * . *' : '. * . * .';
  const title = 'CONGRATULATIONS!';
  const face = '(˶ˆᗜˆ)━☆';
  const faceLines = HAT_LINES.map((line) => placeText(' '.repeat(cols), line, 1));
  const magicStart = face.length + 4;
  const sparkleStep = Math.floor(animationFrame / SPARKLE_STEP_INTERVAL);
  const sparkleGroup = SPARKLE_GROUPS[sparkleStep % SPARKLE_GROUPS.length];
  const sparklePosition = magicStart + sparkleStep;
  const faceLine = placeText(' '.repeat(cols), face, 1);
  const animatedFaceLine = placeText(faceLine, sparkleGroup, sparklePosition);

  const lines = [
    '',
    ...faceLines,
    animatedFaceLine,
    '',
    centerText(title, cols),
    '',
    "YOU'VE LIFTED THE SEAL.",
    'THE DOOR IS NOW OPEN.',
    '',
    stars,
    '',
    'Press any key to return to the study',
  ];
  const faceEnd = HAT_LINES.length + 1;
  const centered = lines.map((line, index) =>
    index >= 1 && index <= faceEnd ? line : centerText(line, cols)
  );
  return normalizeFrame(centered, rows, cols);
}

// ---------------------------------------------------------------------------
// Scene registry
// ---------------------------------------------------------------------------

const scenes: Map<string, SceneEntry> = new Map();

scenes.set('capstone-congrats', {
  fn: completionScene,
  period: COMPLETION_PERIOD,
  fps: COMPLETION_FPS,
  announcement:
    "Congratulations! You've lifted the seal. The door is now open. Press any key to return to the study.",
});

/** Look up a registered scene by id. Returns undefined for unknown ids. */
export function getScene(id: string): SceneEntry | undefined {
  return scenes.get(id);
}

/** Whether a scene id is registered. */
export function hasScene(id: string): boolean {
  return scenes.has(id);
}

/** All registered scene ids, for validation error messages. */
export function sceneIds(): string[] {
  return [...scenes.keys()];
}
