import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Lockup } from '../ui/Logo';
import { LAB_PATH } from '../routes';
import { Hero } from './hero/Hero';
import { Delay } from './sections/Delay';
import { HowItWorks } from './sections/HowItWorks';
import { Lab } from './sections/Lab';
import { Closing } from './sections/Closing';
import './sections/sections.css';
import { preloadBust } from './hero/pointer';
import { useReducedMotion } from './typing';
import './landing.css';

preloadBust();
const LiquidField = lazy(() => import('./hero/LiquidField'));

/** The landing page at `/`. The crew console lives at /lab. */
export default function Landing() {
  useEffect(() => { document.title = 'VITRUVIO · Health monitoring for astronauts'; }, []);
  const reduced = useReducedMotion();
  // The liquid runs only while the page is in front.
  const [shown, setShown] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const change = () => setShown(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  // Native scrolling: the two moments (the delay and the steps) hold their content with sticky,
  // inside their own sections, so nothing else on the page moves with the scroll.
  return (
    <>
      {/* The hero's liquid is the page's ground: one fixed canvas behind every section. */}
      <div className="landing-liquid" aria-hidden="true"><Suspense fallback={null}><LiquidField reduced={reduced} running={shown} /></Suspense></div>
      <header className="landing-nav">
        <a className="landing-home" href="/" aria-label="VITRUVIO, home"><Lockup /></a>
        <a className="landing-cta" href={LAB_PATH}>Open the lab <ArrowRight size={14} aria-hidden="true" /></a>
      </header>
      <div className="landing">
        <main>
          <Hero />
          <Delay />
          <HowItWorks />
          <Lab />
        </main>
        <Closing />
      </div>
      {/* Film grain over everything, fixed and inert so it never repaints the page. */}
      <div className="film-grain" aria-hidden="true" />
    </>
  );
}
