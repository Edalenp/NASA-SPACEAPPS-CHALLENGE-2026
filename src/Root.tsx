import { lazy, Suspense } from 'react';
import { isLabPath } from './routes';
import { LoaderPlate } from './ui/LoaderPlate';

/**
 * Two pages, no router: `/` is the landing page and `/lab` the crew console. Each is its own
 * chunk, so the landing never downloads the 3D twin, and the console never loads the landing.
 */
const Lab = lazy(() => import('./lab'));
const Landing = lazy(() => import('./landing/Landing'));

export default function Root() {
  const lab = isLabPath(window.location.pathname);
  const Page = lab ? Lab : Landing;
  // The console's loading plate shows from the first paint, before its code has arrived, so the
  // crew never sees a blank screen; the console's own loader then takes it over in place.
  return (
    <Suspense fallback={lab ? <LoaderPlate /> : null}>
      <Page />
    </Suspense>
  );
}
