interface IconProps {
  size?: number;
  className?: string;
}

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };
}

export function IconBall({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5l4.3 3.1-1.6 5H9.3l-1.6-5z" />
      <path d="M12 3v4.5M4.6 9.2l3.1 1.4M19.4 9.2l-3.1 1.4M7.7 18.6l1.6-2.6M16.3 18.6l-1.6-2.6" />
    </svg>
  );
}

export function IconDice({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTrophy({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3" />
      <path d="M12 13v3M9 20h6M10 20a2 2 0 0 1 4 0" />
    </svg>
  );
}

export function IconCards({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="4" y="6" width="10" height="14" rx="2" transform="rotate(-8 9 13)" />
      <rect x="10" y="4" width="10" height="14" rx="2" transform="rotate(8 15 11)" />
      <path d="M15 8l1.4 2-1.4 2-1.4-2z" />
    </svg>
  );
}

export function IconPin({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 21s6-5.3 6-10a6 6 0 0 0-12 0c0 4.7 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.3" />
    </svg>
  );
}

export function IconMic({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </svg>
  );
}

export function IconPlay({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconBolt({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
    </svg>
  );
}

export function IconGift({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="4" y="9" width="16" height="11" rx="1.5" />
      <path d="M4 13h16M12 9v11M12 9c-2 0-4-1-4-3a2 2 0 0 1 4 0c0 2 2 3 4 3a2 2 0 0 0-4-3z" />
    </svg>
  );
}

export function IconShield({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
