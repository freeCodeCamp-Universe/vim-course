import { BrowserRouter, Route, Routes } from 'react-router';
import { CourseLayout } from './views/CourseLayout';
import { HomePage } from './views/HomePage';
import { LessonRoute } from './views/LessonRoute';

export function App() {
  return (
    <BrowserRouter>
      <CourseLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/learn/:lessonId" element={<LessonRoute />} />
        </Routes>
      </CourseLayout>
    </BrowserRouter>
  );
}
