import { Shape } from 'three';

export function chamferedPath(width: number, height: number, cut: number, x = 0, y = 0) {
  const path = new Shape();
  const left = x - width / 2;
  const right = x + width / 2;
  const bottom = y - height / 2;
  const top = y + height / 2;
  path.moveTo(left + cut, bottom);
  path.lineTo(right - cut, bottom);
  path.lineTo(right, bottom + cut);
  path.lineTo(right, top - cut);
  path.lineTo(right - cut, top);
  path.lineTo(left + cut, top);
  path.lineTo(left, top - cut);
  path.lineTo(left, bottom + cut);
  path.closePath();
  return path;
}
