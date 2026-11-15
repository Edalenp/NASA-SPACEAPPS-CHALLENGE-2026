import { describe, expect, it } from 'vitest';
import { isLabPath } from './routes';

describe('page routing', () => {
  it('serves the console under /lab', () => {
    expect(isLabPath('/lab')).toBe(true);
    expect(isLabPath('/lab/')).toBe(true);
  });
  it('serves the landing page everywhere else', () => {
    expect(isLabPath('/')).toBe(false);
    expect(isLabPath('/laboratory')).toBe(false);
    expect(isLabPath('/about')).toBe(false);
  });
});
