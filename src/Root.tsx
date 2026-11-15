import { lazy, Suspense } from 'react';
import { isLabPath } from './routes';

/**
 * Two pages, no router: `/` is the landing page and `/lab` the crew console. Each is its own
 * chunk, so the landing never downloads the 3D twin, and the console never loads the landing.
 */
const Lab = lazy(() => import('./lab'));
const Landing = lazy(() => import('./landing/Landing'));

export default function Root() {
  const Page = isLabPath(window.location.pathname) ? Lab : Landing;
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}
