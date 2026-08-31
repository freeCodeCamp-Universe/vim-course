import { CheckCircleIcon, CircleIcon } from '@/components/base/Icon';
import { renderInline } from '@/components/base/Markdown/renderInline';
import styles from './CurriculumTree.module.css';

export interface CurriculumTreeLesson {
  id: string;
  title: string;
}

export interface CurriculumTreeModule {
  slug: string;
  title: string;
  lessons: CurriculumTreeLesson[];
  number?: number;
}

export type CurriculumTreeLessonState = 'completed' | 'current' | 'completed-current' | 'available';

interface Props {
  modules: CurriculumTreeModule[];
  variant: 'home' | 'drawer';
  lessonState?: (id: string) => CurriculumTreeLessonState;
  onLessonClick?: () => void;
  /** Ref attached to the current lesson's link, for scroll-into-view / focus management. */
  currentLessonRef?: React.RefObject<HTMLAnchorElement | null>;
}

export function CurriculumTree({
  modules,
  variant,
  lessonState,
  onLessonClick,
  currentLessonRef,
}: Props) {
  const stateFor = lessonState ?? (() => 'available' as const);
  const ModuleHeading = variant === 'home' ? 'h2' : 'h3';
  const variantClass = (suffix: string) => styles[`${variant}-${suffix}`];

  return (
    <ol className={variantClass('modules')}>
      {modules.map((module, moduleIndex) => (
        <li key={module.slug} className={variantClass('module')}>
          <ModuleHeading className={variantClass('module-title')}>
            <span>{module.number ?? moduleIndex + 1}.</span> {module.title}
          </ModuleHeading>
          <ol className={variantClass('lessons')}>
            {module.lessons.map((lesson) => {
              const state = stateFor(lesson.id);
              return (
                <li
                  key={lesson.id}
                  className={`${variantClass('lesson')} ${variant}-lesson`}
                  data-lesson-id={lesson.id}
                  data-state={state}
                >
                  <a
                    href={`/learn/${lesson.id}`}
                    className={`${variantClass('lesson-row')} ${variant}-lesson-row`}
                    aria-current={isCurrentState(state) ? 'step' : undefined}
                    ref={isCurrentState(state) ? currentLessonRef : undefined}
                    onClick={onLessonClick}
                  >
                    <Marker
                      state={state}
                      className={`${variantClass(`marker-${markerState(state)}`)} ${variant}-marker ${variant}-marker-${markerState(state)}`}
                    />{' '}
                    <span className="sr-only">
                      {isCompletedState(state) ? 'Completed' : 'Not completed'}
                    </span>{' '}
                    <span className={variantClass('lesson-title')}>
                      {renderInline(lesson.title)}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}

function Marker({ state, className }: { state: CurriculumTreeLessonState; className: string }) {
  return isCompletedState(state) ? (
    <CheckCircleIcon className={className} />
  ) : (
    <CircleIcon className={className} />
  );
}

function isCompletedState(state: CurriculumTreeLessonState): boolean {
  return state === 'completed' || state === 'completed-current';
}

function isCurrentState(state: CurriculumTreeLessonState): boolean {
  return state === 'current' || state === 'completed-current';
}

function markerState(state: CurriculumTreeLessonState): 'completed' | 'current' | 'available' {
  if (isCompletedState(state)) {
    return 'completed';
  }
  return state === 'current' ? 'current' : 'available';
}
