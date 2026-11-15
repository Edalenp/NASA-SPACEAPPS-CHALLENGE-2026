import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LiveFigure } from './LiveFigure';

const render = (value: string) => renderToStaticMarkup(<LiveFigure value={value} />);

describe('LiveFigure numeric truth', () => {
  it('renders the supplied value every time, including zero and the unavailable placeholder', () => {
    expect(render('200')).toContain('data-live-figure');
    expect(render('200')).toContain('>200<');
    expect(render('0')).toContain('>0<');
    expect(render('—')).toContain('>—<');
  });

  it('is deterministic with no random or rolling state', () => {
    const first = render('200');
    expect(first).toBe(render('200'));
    expect(first).not.toContain('rolling');
  });
});
