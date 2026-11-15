import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Lockup } from '../ui/Logo';
import { LAB_PATH } from '../routes';
import { Hero } from './hero/Hero';
import { Delay } from './sections/Delay';
import { HowItWorks } from './sections/HowItWorks';
import { Lab } from './sections/Lab';
import { NasaStory } from './sections/NasaStory';
import { Closing } from './sections/Closing';
import './sections/sections.css';
import { preloadBust } from './hero/pointer';
import { useReducedMotion } from './typing';
import { LandingLoader } from './LandingLoader';
import './landing.css';

preloadBust();
const FiberField = lazy(() => import('./hero/FiberField'));

/** The landing page at `/`. The crew console lives at /lab. */
export default function Landing() {
  useEffect(() => { document.title = 'VITRUVIO · Health monitoring for astronauts'; }, []);
  const reduced = useReducedMotion();
  // The ground runs only while the page is in front.
  const [shown, setShown] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const change = () => setShown(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  // Native scrolling: the two moments (the delay and the steps) hold their content with sticky,
  // inside their own sections, so nothing else on the page moves with the scroll.
  // Past the top of the page the navigation turns solid, so text never shows through it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 24);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  return (
    <>
      {/* The page's ground, muscle fibres in the hero's state: one fixed canvas behind every section. */}
      <div className="landing-liquid" aria-hidden="true"><Suspense fallback={null}><FiberField reduced={reduced} running={shown} /></Suspense></div>
      <header className={`landing-nav ${scrolled ? 'is-solid' : ''}`}>
        <a className="landing-home" href="/" aria-label="VITRUVIO, home"><Lockup /></a>
        <a className="landing-link" href={LAB_PATH}><i aria-hidden="true" />Open the lab <ArrowRight size={14} aria-hidden="true" /></a>
      </header>
      <div className="landing">
        <main>
          <Hero />
          <Delay />
          <HowItWorks />
          <NasaStory />
          <Lab />
        </main>
        <Closing />
      </div>
      <LandingLoader />
      {/* Film grain over everything, fixed and inert so it never repaints the page. */}
      <div className="film-grain" aria-hidden="true" />
    </>
  );
}
