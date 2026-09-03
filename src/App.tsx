import { Route, Switch } from 'wouter';
import { CourseLayout } from './views/CourseLayout';
import { HomePage } from './views/HomePage';
import { LessonRoute } from './views/LessonRoute';

export function App() {
  return (
    <CourseLayout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/learn/:lessonId" component={LessonRoute} />
      </Switch>
    </CourseLayout>
  );
}
