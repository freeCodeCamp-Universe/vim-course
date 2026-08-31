import { openVirtualFile } from './filesystem';
import type { CommandResult } from './registry';
import type { EditorState } from './types';

/**
 * Enter animation mode: set the mode flag and record which scene to play.
 * The buffer and cursor are left untouched so dismissal restores the editing
 * surface with no save/restore dance.
 */
export function enterAnimation(
  state: EditorState,
  scene: string,
  options: { onDismiss?: { open: string }; isCompletion?: boolean } = {}
): EditorState {
  return {
    ...state,
    mode: 'animation',
    animation: { scene, ...options },
    completionShown: options.isCompletion ? true : state.completionShown,
    status: '',
    statusIsError: false,
  };
}

/**
 * Process one key while an animation owns the screen. Any key dismisses the
 * animation and returns to normal mode, recording a `mode` action naming the
 * scene so a checklist can require that the learner moved on.
 */
export function processAnimationKey(state: EditorState, _key: string): CommandResult {
  const animation = state.animation;
  const dismissed = {
    ...state,
    mode: 'normal' as const,
    animation: null,
    status: '',
    statusIsError: false,
  };
  const reopened = animation?.onDismiss?.open
    ? openVirtualFile(dismissed, animation.onDismiss.open).state
    : dismissed;

  return {
    state: reopened,
    actions: [{ type: 'mode', command: `dismiss-animation:${state.animation?.scene ?? ''}` }],
  };
}
