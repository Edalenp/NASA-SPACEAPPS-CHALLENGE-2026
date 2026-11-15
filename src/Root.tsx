import { lazy, Suspense } from 'react';
import { isLabPath } from './routes';
import { LoaderPlate } from './ui/LoaderPlate';
import { LANDING_STEPS } from './landing/loadState';

/**
 * Two pages, no router: `/` is the landing page and `/lab` the crew console. Each is its own
 * chunk, so the landing never downloads the 3D twin, and the console never loads the landing.
 */
const Lab = lazy(() => import('./lab'));
const Landing = lazy(() => import('./landing/Landing'));

export default function Root() {
  const lab = isLabPath(window.location.pathname);
  const Page = lab ? Lab : Landing;
  // Each page's loading plate shows from the first paint, before its code has arrived, so no one
  // sees a blank screen; the page's own loader then takes it over in place.
  return (
    <Suspense fallback={lab ? <LoaderPlate /> : <LoaderPlate steps={LANDING_STEPS} label="Preparing VITRUVIO" item="Starting" />}>
      <Page />
    </Suspense>
  );
}
