import { loadCurriculum } from '@/curriculum/loader';
import { buildTreeModules } from '@/curriculum/buildTreeModules';

export function GET() {
  const { modules, lessons } = loadCurriculum();
  const treeModules = buildTreeModules(modules, lessons);
  const orderedLessonIds = modules.flatMap((m) => m.lessonIds);

  return new Response(JSON.stringify({ modules: treeModules, orderedLessonIds }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
