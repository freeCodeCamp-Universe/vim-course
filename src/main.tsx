import '@/styles/global.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initVirtualKeyboardViewport } from './hooks/useVirtualKeyboardViewport';

initVirtualKeyboardViewport();

createRoot(document.getElementById('root')!).render(<App />);
