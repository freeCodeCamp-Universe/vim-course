import type { Action } from './actionHistory';

export type Mode =
  | 'normal'
  | 'insert'
  | 'visual'
  | 'visual-line'
  | 'command-line'
  | 'explorer'
  | 'shell'
  | 'animation';

export interface Cursor {
  line: number;
  col: number;
}

export type Buffer = string[];

export interface VirtualFile {
  contents: Buffer;
  dirty: boolean;
  saved: Buffer;
  /**
   * True once the file has been written at least once (`:w`, `:wq`). A pristine
   * file is clean but unwritten, so `!dirty` alone cannot tell "saved" from
   * "never touched"; validators that assert a save need both.
   */
  written: boolean;
  /**
   * True when the file exists in the simulated working directory. Seeded lesson
   * files do; a path conjured by `:e <missing>` does not, until a `:w` creates
   * it. Real Vim distinguishes the two — it opens an empty buffer and reports
   * `"name" [New]` — and netrw lists only what is actually on disk.
   */
  onDisk: boolean;
}

export type VirtualFilesystem = Map<string, VirtualFile>;

/**
 * The netrw explorer state: a read-only listing of the virtual filesystem's
 * paths and the currently selected row. Null unless the mode is `explorer`.
 */
export interface ExplorerState {
  entries: string[];
  selected: number;
  /** The directory represented by the listing, with '' meaning the root. */
  cwd: string;
}

/**
 * The simulated shell state after quitting Vim: the command the learner is
 * typing and the output from rejected commands. Only `vim` reopens the editor;
 * anything else is a no-op. Null unless the mode is `shell`.
 */
export interface ShellState {
  input: string;
  /** Zero-based offset into `input` where the cursor sits (0 = before the first character). */
  cursorPos: number;
  /** Accumulated shell output lines (rejected-command prompts and error messages). */
  output: string[];
  /**
   * The cursor to restore when `vim <file>` reopens from this shell, captured as
   * the editor dropped into the shell. For a cold-start shell this is the lesson's
   * seeded `config.cursor`, which is otherwise lost when the prompt takes over the
   * cursor; reopening then lands there rather than at the top-left corner.
   */
  openCursor: Cursor;
}

/**
 * The unnamed register: text captured by a delete/change/yank, replayed by `p`
 * (Task 7). `linewise` distinguishes whole-line content (`dd`, `cc`, `yy`) from
 * charwise content (`x`, `dw`, `D`), which paste differently.
 */
export interface Register {
  text: string;
  linewise: boolean;
}

/**
 * A point-in-time buffer + cursor capture. The undo/redo stacks (Task 7) hold
 * these; registers are intentionally not captured, matching Vim (undo does not
 * restore register contents).
 */
export interface Snapshot {
  buffer: Buffer;
  cursor: Cursor;
}

/**
 * One match in the quickfix list built by `:vimgrep` / `:grep`. `line`/`col` are
 * 0-based like {@link Cursor}; `text` is the whole matched line, kept for
 * `:clist` to display without re-reading the file.
 */
export interface QuickfixEntry {
  path: string;
  line: number;
  col: number;
  text: string;
}

/**
 * The quickfix list and the entry `:cnext`/`:cprev`/`:cc` currently sit on.
 * `index` is `-1` before the first jump (as after a `:vimgrep /pat/j`, which
 * builds the list without moving). Session display state like {@link EditorState.lastSearch}:
 * never written to a file, never captured in an undo snapshot.
 */
export interface QuickfixList {
  entries: QuickfixEntry[];
  index: number;
}

/**
 * A map from terrain glyph to the set of commands permitted to traverse it.
 * Characters absent from the map are ordinary text and never block. A non-null
 * value on {@link EditorState.terrain} activates the terrain veto in dispatch.
 */
export type TerrainRules = Map<string, ReadonlySet<string>>;

export interface EditorState {
  buffer: Buffer;
  activeFilePath: string;
  files: VirtualFilesystem;
  cursor: Cursor;
  /**
   * The column `j`/`k` try to land on, remembered across vertical moves. When
   * the cursor crosses a short line, `clampCursor` snaps it to the line's end,
   * but this field preserves the original column so a later long line restores
   * it. Any horizontal motion or edit clears it to `null`.
   */
  desiredCol: number | null;
  mode: Mode;
  /** The lesson-specific unsupported-command message template, when configured. */
  unsupportedMessage?: string;
  /** In command-line mode, the typed ex command (without the leading `:`). */
  commandLine: string;
  /** In command-line mode, the cursor offset in the typed command. */
  commandLineCursor: number;
  /** Which prompt command-line mode is capturing: `:` ex or `/` search. */
  commandLinePrompt: ':' | '/';
  /**
   * True while the command line is waiting for a register name after `Ctrl-r`.
   * The next keystroke selects the register; a `"` pasts from the unnamed
   * register (Vim standard), and `Enter` does the same (simplified shortcut
   * so learners don't need to know about register names). `Escape`/`Ctrl-c`
   * cancels the command line entirely, matching real Vim.
   */
  commandLineRegisterPending: boolean;
  dirty: boolean;
  status: string;
  statusIsError: boolean;
  /**
   * Whether the buffer renders with a line-number gutter (`:set number`). A
   * display option, not buffer content: it is never written to a file, survives
   * `:e` into another file the way a Vim window option does, and is deliberately
   * absent from undo snapshots, so `u` never toggles it back.
   */
  showLineNumbers: boolean;
  /** The netrw explorer listing + selection; null unless mode is `explorer`. */
  explorer: ExplorerState | null;
  /** The simulated shell after quitting; null unless mode is `shell`. */
  shell: ShellState | null;
  /**
   * Whether Vim's startup splash is drawn over the buffer. Purely a display
   * flag: the splash is not a mode, it is the filler real Vim paints across an
   * empty unnamed buffer, so every normal-mode key works underneath it exactly
   * as it would in a file. Cleared by the first keystroke that changes the
   * buffer or loads another one (see `dispatch`), matching Vim, where the intro
   * survives `:`/`Esc` but not an edit or an `:e`.
   */
  splashVisible: boolean;
  /**
   * Where the visual selection is anchored: the position the cursor was on when
   * `v`/`V` was pressed. The anchor stays put while motions move the cursor, and
   * the two ends together are the selection. Null outside the visual modes.
   */
  visualAnchor: Cursor | null;
  /** A pending operator awaiting a motion/text-object (`d`, `c`, `y`). */
  pendingOperator: string | null;
  /** A pending text-object prefix after an operator (currently `i`). */
  pendingTextObject: 'i' | null;
  /** Accumulated count digits, e.g. "3" for `3dd`. Empty when none is pending. */
  pendingCount: string;
  /** The unnamed register; null until a delete/change/yank fills it. */
  register: Register | null;
  /** The most recent search pattern, replayed by `n`/`N`; null until first `/`. */
  lastSearch: { pattern: string } | null;
  /** The quickfix list from `:vimgrep`/`:grep`; null until the first one runs. */
  quickfix: QuickfixList | null;
  /**
   * Whether the `:clist` listing is drawn over the buffer. A display flag like
   * {@link EditorState.splashVisible}: the real buffer is untouched underneath, and any key
   * dismisses the overlay (see `dispatch`).
   */
  quickfixListing: boolean;
  /**
   * The first entry index (0-based) currently visible in the `:clist` pager. `j`/`d`/SPACE
   * scroll down; `k`/`u`/`b` scroll up. Reset to 0 when the listing closes.
   */
  quickfixScrollOffset: number;
  /** Snapshots to restore on `u`, most recent last. */
  undoStack: Snapshot[];
  /** Snapshots to reapply on `Ctrl-r`, cleared by any new change. */
  redoStack: Snapshot[];
  /**
   * Terrain rules for maze-style lessons. Null means normal file editing; non-null
   * activates the terrain veto in dispatch, where each glyph maps to the set of
   * commands permitted to cross it.
   */
  terrain: TerrainRules | null;
  /**
   * The active animation scene, or null when no animation is showing. Non-null
   * only while `mode === 'animation'`; the scene id names a registered scene
   * function the presentation layer resolves to a frame loop.
   */
  animation: {
    scene: string;
    onDismiss?: { open: string };
    isCompletion?: boolean;
  } | null;
  /** Whether the lesson's completion animation has already been shown. */
  completionShown: boolean;
  /** Append-only log of executed actions, observed by workshop validators. */
  history: Action[];
}
