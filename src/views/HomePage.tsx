import { useCurriculumTree } from '@/curriculum/useCurriculumTree';
import { LoadingState } from '@/components/base/LoadingState/LoadingState';
import { FccLogoIcon } from '@/components/base/Icon';
import { Home } from './Home';
import styles from './HomePage.module.css';

export function HomePage() {
  const tree = useCurriculumTree();

  if (!tree) {
    return <LoadingState label="Loading course" />;
  }

  return (
    <>
      <main id="main" className={styles.page} tabIndex={-1}>
        <h1 className={styles.title}>Learn Vim for Terminal Text Editing</h1>
        <Home />
      </main>
      <footer className={styles.footer}>
        <p className={styles['footer-text']}>
          <FccLogoIcon className={styles['footer-logo']} />
          <span>
            Developed by the{' '}
            <a
              href="https://www.freecodecamp.org"
              target="_blank"
              rel="noopener noreferrer"
              className={styles['footer-link']}
            >
              freeCodeCamp
            </a>{' '}
            team
          </span>
        </p>
      </footer>
    </>
  );
}
