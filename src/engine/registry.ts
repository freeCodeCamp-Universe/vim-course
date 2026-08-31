import type { Action } from './actionHistory';
import type { EditorState } from './types';

export interface CommandContext {
  state: EditorState;
  /** Resolved count prefix (`3` in `3dd`), or null when none was given. */
  count: number | null;
}

export interface CommandResult {
  state: EditorState;
  /** Records this command contributes to the action history. */
  actions?: Action[];
  /**
   * True when the command is an incomplete multi-key prefix (e.g. the first `g`
   * of `gg`, or an operator awaiting its motion). Dispatch preserves the pending
   * operator/count it left in `state` instead of clearing them.
   */
  pending?: boolean;
  /**
   * True when the command manages the undo/redo stacks itself (`u`, `Ctrl-r`),
   * so `dispatch` must not record a fresh undo point for its buffer change.
   */
  undoTransparent?: boolean;
}

export type CommandHandler = (context: CommandContext) => CommandResult;

export interface Registry {
  register(key: string, handler: CommandHandler): void;
  get(key: string): CommandHandler | undefined;
  has(key: string): boolean;
}

export function createRegistry(): Registry {
  const handlers = new Map<string, CommandHandler>();
  return {
    register(key, handler) {
      handlers.set(key, handler);
    },
    get(key) {
      return handlers.get(key);
    },
    has(key) {
      return handlers.has(key);
    },
  };
}

/**
 * The shared normal-mode registry. Command modules (Tasks 4+) register their
 * handlers into it at import time; `dispatch` reads from it by default.
 */
export const normalModeRegistry = createRegistry();
