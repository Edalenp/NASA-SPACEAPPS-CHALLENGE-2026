/**
 * The crew member's profile picture. There is no real photo of a real person in a prototype, so the
 * portrait is drawn: a bust in the guides' line style on a quiet aura, framed like a profile photo.
 */
export function CrewAvatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span className="crew-avatar aura" style={{ width: size, height: size }} role="img" aria-label={`${name}, profile picture`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <defs>
          <linearGradient id="crew-avatar-suit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        {/* Shoulders in a flight suit, a collar, the neck and the head. */}
        <path d="M4 36c0-7.2 5.6-11 14-11s14 3.8 14 11z" fill="url(#crew-avatar-suit)" />
        <path d="M14.2 25.4 18 29l3.8-3.6" fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" />
        <path d="M15.6 21.5v3.6h4.8v-3.6" fill="currentColor" fillOpacity="0.5" />
        <ellipse cx="18" cy="14.6" rx="5.6" ry="6.6" fill="currentColor" fillOpacity="0.72" />
        <path d="M12.4 13.4c.2-4.1 2.7-6.2 5.8-6.2 3.2 0 5.4 2.1 5.5 5.6-1.6-1.5-3.6-2.3-6-2.3-2.1 0-3.9.9-5.3 2.9z" fill="currentColor" fillOpacity="0.95" />
      </svg>
    </span>
  );
}
