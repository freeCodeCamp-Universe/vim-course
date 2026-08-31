export type {
  Buffer,
  Cursor,
  EditorState,
  Mode,
  ExplorerState,
  ShellState,
  Register,
  Snapshot,
  QuickfixEntry,
  QuickfixList,
  TerrainRules,
  VirtualFile,
  VirtualFilesystem,
} from './types';
export {
  clampCol,
  clampCursor,
  clampLine,
  deleteChar,
  deleteLine,
  getLine,
  insertChar,
  insertLine,
  joinLines,
  lineCount,
  normalizeBuffer,
  insertText,
  splitLine,
} from './buffer';
export {
  createState,
  markDirty,
  moveCursor,
  setLineNumbers,
  setBuffer,
  setMode,
  setRegister,
  setError,
  setStatus,
} from './state';
export {
  createVirtualFilesystem,
  DEFAULT_FILE_PATH,
  E32,
  E37,
  getVirtualFile,
  newFileStatus,
  openVirtualFile,
  revertVirtualFile,
  setVirtualFile,
  writeVirtualFile,
} from './filesystem';
export type { FilesystemSeed, OpenFileResult } from './filesystem';
export {
  enterExplorer,
  listEntries,
  moveExplorerSelection,
  openExplorerSelection,
  processExplorerKey,
} from './explorer';
export { enterShell, enterSplash, processShellKey, SHELL_PROMPT, splashText } from './shell';
export type { Action, ActionType } from './actionHistory';
export { actionAttempts, actionCursors, actionModes, appendActions } from './actionHistory';
export type { CommandContext, CommandHandler, CommandResult, Registry } from './registry';
export { createRegistry, normalModeRegistry } from './registry';
export type { AllowedCommands, DispatchOptions, DispatchResult, FilterVerdict } from './dispatch';
export { dispatch, dispatchPaste } from './dispatch';
export { processCommandLineKey } from './commandLine';
export { runExCommand } from './commands/ex';
export { runSearch } from './commands/search';
export { processInsertKey } from './commands/insert';
export { resolveYankMotion } from './commands/yankPaste';
export { isVisualMode, processVisualKey, visualSelection } from './commands/visual';
export type { VisualKeyOptions, VisualSelection } from './commands/visual';
export { ARROW_KEYS, ESCAPE_KEYS } from './keys';
export { applyRedo, applyUndo, snapshotOf } from './undoStack';
export { canTraverse } from './terrain';
export { enterAnimation, processAnimationKey } from './animation';
