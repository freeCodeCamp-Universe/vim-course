/**
 * Named bundles of commands, so a lesson's `allowedCommands` / `disallowedCommands`
 * can reference a whole family by an `@`-prefixed alias (`"@navigation"`) instead of
 * spelling out every key. An alias expands, at load time, to the commands listed
 * here and mixes freely with raw commands: `["@navigation", "x"]`.
 *
 * The `@` prefix is what keeps aliases and commands in separate namespaces — a raw
 * command is never mistaken for a group and a group name never collides with a real
 * command (`vim`, `v`), so groups can be named for what they teach.
 *
 * Each entry lists commands the way a lesson would: the resolved form the filter
 * matches (`gg`, `dd`, `:w`), not a leading key. Extend this map when a new family
 * of lessons wants a shared vocabulary; keep the names task-facing.
 */
export const COMMAND_GROUPS: Record<string, readonly string[]> = {
  navigation: ['h', 'j', 'k', 'l', '0', '$', 'w', 'b', 'gg', 'G', '%'],
  arrows: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  insert: ['i', 'a', 'A', 'o', 'O'],
  deletion: ['x', 'D', 'dd', 'dw'],
  change: ['cc', 'cw'],
  copyPaste: ['yy', 'yl', 'p'],
  undo: ['u', 'Ctrl-r'],
  visual: ['v', 'V'],
  search: ['/', 'n', 'N'],
};

/**
 * Expand any `@group` alias in a command list to the commands it names, leaving raw
 * commands untouched. Throws on an unknown group, in the loader's error voice, so a
 * typo'd alias fails the lesson at load rather than silently permitting nothing.
 */
export function expandCommandGroups(
  commands: readonly string[],
  field: string,
  lessonId: string,
  path: string
): string[] {
  return commands.flatMap((entry) => {
    if (!entry.startsWith('@')) {
      return [entry];
    }
    const name = entry.slice(1);
    const group = COMMAND_GROUPS[name];
    if (group === undefined) {
      throw new Error(
        `Config field ${field} for ${lessonId} in ${path} references unknown command group "${entry}"`
      );
    }
    return [...group];
  });
}
