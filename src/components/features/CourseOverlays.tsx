import type { CurriculumTreeModule } from '@/components/features/CurriculumTree';
import { NavDrawer } from '@/components/features/NavDrawer';
import { SettingsModal } from '@/components/features/SettingsModal';
import { ShortcutsModal } from '@/components/features/ShortcutsModal';
import { useCourseChrome } from '@/stores/courseChrome';

interface CourseOverlaysProps {
  currentLessonId?: string;
  modules?: CurriculumTreeModule[];
}

/**
 * The single island that hosts both global overlays, mounted once by
 * {@link CourseLayout}. It connects the two controlled dialogs to the shared
 * {@link courseChrome} store so the header buttons and a lesson's `Alt+K`
 * — which live in other islands — can open them across the island boundary.
 */
export function CourseOverlays({ currentLessonId, modules }: CourseOverlaysProps) {
  const {
    drawerOpen,
    shortcutsOpen,
    settingsOpen,
    closeDrawer,
    closeShortcuts,
    closeSettings,
    triggerElement,
  } = useCourseChrome();

  return (
    <>
      <NavDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        modules={modules ?? []}
        currentLessonId={currentLessonId}
        triggerElement={triggerElement}
      />
      <ShortcutsModal
        open={shortcutsOpen}
        onClose={closeShortcuts}
        triggerElement={triggerElement}
      />
      <SettingsModal open={settingsOpen} onClose={closeSettings} triggerElement={triggerElement} />
    </>
  );
}
