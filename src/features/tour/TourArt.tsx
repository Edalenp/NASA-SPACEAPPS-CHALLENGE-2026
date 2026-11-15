import type { ReactNode } from 'react';

/** Line drawings for each tour step, in the guides' style: ink strokes, one green accent. */
const art: Record<string, ReactNode> = {
  twin: (
    <>
      <circle cx="40" cy="12" r="6" />
      <path d="M32 22h16l3 22h-5l-2 26h-4l-1-18-1 18h-4l-2-26h-5z" />
      <circle cx="38" cy="30" r="3" className="accent fill" />
      <path d="M14 70h52" className="soft" />
      <path d="M58 26h12M58 34h8" className="soft" />
    </>
  ),
  dock: (
    <>
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={6 + (i % 3) * 23} y={i < 3 ? 22 : 44} width="20" height="18" rx="1" className={i === 1 ? 'accent' : undefined} />)}
      <path d="M10 30h8M33 30h8M56 30h8" className="soft" />
    </>
  ),
  inspector: (
    <>
      <rect x="14" y="10" width="52" height="60" rx="1" />
      <path d="M20 18h22M20 26h10M34 26h10M48 26h10" className="soft" />
      <rect x="20" y="34" width="40" height="22" rx="1" className="accent" />
      <path d="M24 48c4-8 6 6 10-2s6 4 10-4 6 6 10 0" className="accent" />
      <path d="M20 62h18M44 62h16" className="soft" />
    </>
  ),
  score: (
    <>
      <path d="M12 56a28 28 0 0 1 56 0" />
      <path d="M12 56a28 28 0 0 1 14-24" className="accent thick" />
      <path d="M40 56l-12-14" />
      <circle cx="40" cy="56" r="3" className="fill" />
      <path d="M18 66h44" className="soft" />
    </>
  ),
  check: (
    <>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <rect x={8 + i * 9.5} y="30" width="7" height="7" rx="1" className={i < 5 ? 'accent fill' : undefined} />
        </g>
      ))}
      <path d="M8 48h64" className="soft" />
      <path d="M8 48h46" className="accent thick" />
      <path d="M8 60h30" className="soft" />
    </>
  ),
  camera: (
    <>
      <path d="M40 18l18 10v20L40 58 22 48V28z" />
      <path d="M22 28l18 10 18-10M40 38v20" className="soft" />
      <path d="M12 46a30 30 0 0 0 20 20" className="accent" />
      <path d="M28 66l4 0-1-4" className="accent" />
      <path d="M68 30a30 30 0 0 0-20-20" className="accent" />
      <path d="M52 10l-4 0 1 4" className="accent" />
    </>
  ),
  nav: (
    <>
      <path d="M8 16h20M32 16h18M54 16h18" className="soft" />
      <path d="M8 20h20" className="accent thick" />
      <path d="M10 64l12-14 10 8 14-20 10 10 14-16" className="accent" />
      <path d="M8 68h64" className="soft" />
    </>
  ),
  emergency: (
    <>
      <rect x="18" y="16" width="44" height="44" rx="1" />
      <path d="M40 26v24M28 38h24" className="accent thick" />
      <circle cx="62" cy="62" r="9" />
      <path d="M62 57v5l3 2" />
    </>
  ),
  help: (
    <>
      <circle cx="40" cy="38" r="22" />
      <path d="M33 32a7 7 0 1 1 9 7c-2 1-2 2-2 5" className="accent thick" />
      <circle cx="40" cy="51" r="1.8" className="accent fill" />
    </>
  ),
};

export function TourArt({ name }: { name: string }) {
  return (
    <svg className="tour-art" viewBox="0 0 80 76" aria-hidden="true">
      {art[name]}
    </svg>
  );
}
