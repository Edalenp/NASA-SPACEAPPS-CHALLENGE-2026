import { createRoot } from 'react-dom/client';
import { LiveFigure } from '../../src/ui/LiveFigure';

declare global {
  interface Window {
    __liveFigure?: { render(value: string): void };
  }
}

const mount = document.getElementById('root')!;
const expected = document.querySelector<HTMLElement>('[data-expected]')!;
const root = createRoot(mount);

window.__liveFigure = {
  render(value) {
    expected.textContent = value;
    root.render(<LiveFigure value={value} />);
  },
};

window.__liveFigure.render('200');
