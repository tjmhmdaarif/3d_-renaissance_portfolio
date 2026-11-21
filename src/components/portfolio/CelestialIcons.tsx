import type { SVGProps } from 'react';

interface EmblemProps {
  chapterIndex: number;
  className?: string;
}

export function CelestialEmblem({
  chapterIndex,
  className = 'h-7 w-7',
}: EmblemProps) {
  switch (chapterIndex) {
    case 0:
      // Chapter I: Helios Sunburst Compass
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <circle
            cx="18"
            cy="18"
            r="14.5"
            stroke="rgba(229, 193, 123, 0.32)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <g className="celestial-spin-slow">
            <path
              d="M18 2.5V6.5M18 29.5V33.5M2.5 18H6.5M29.5 18H33.5M7.04 7.04L9.87 9.87M26.13 26.13L28.96 28.96M28.96 7.04L26.13 9.87M9.87 26.13L7.04 28.96"
              stroke="#E5C17B"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </g>
          <circle
            cx="18"
            cy="18"
            r="6.2"
            stroke="#FAF6EE"
            strokeWidth="1.25"
          />
          <circle
            cx="18"
            cy="18"
            r="2"
            fill="#E5C17B"
            className="celestial-breathe"
          />
        </svg>
      );

    case 1:
      // Chapter II: Celestial Chariot Orbital Vector
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <g className="celestial-spin-slow">
            <ellipse
              cx="18"
              cy="18"
              rx="14"
              ry="7.5"
              transform="rotate(-24 18 18)"
              stroke="#E5C17B"
              strokeWidth="1.25"
            />
            <circle cx="30.5" cy="12.5" r="2" fill="#9ED8EB" />
          </g>
          <g className="celestial-spin-reverse">
            <circle
              cx="18"
              cy="18"
              r="9.5"
              stroke="rgba(250, 246, 238, 0.4)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          </g>
          <circle cx="18" cy="18" r="2.6" stroke="#FAF6EE" strokeWidth="1.25" />
        </svg>
      );

    case 2:
      // Chapter III: Sol & Luna Acoustic Equilibrium
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <circle
            cx="13.5"
            cy="15"
            r="6.5"
            stroke="#E5C17B"
            strokeWidth="1.25"
          />
          <path
            d="M23.5 9.5A6.8 6.8 0 1 0 28.5 21.2A5.5 5.5 0 1 1 23.5 9.5Z"
            stroke="#9ED8EB"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            d="M5 27.5C9.5 24.5 13 30 18 27.5C23 25 26.5 30 31 27.5"
            stroke="rgba(250, 246, 238, 0.72)"
            strokeWidth="1.25"
            strokeLinecap="round"
            className="celestial-breathe"
          />
        </svg>
      );

    case 3:
      // Chapter IV: Council of Olympus Concentric Cupola
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <circle
            cx="18"
            cy="18"
            r="14"
            stroke="rgba(229, 193, 123, 0.45)"
            strokeWidth="1.25"
          />
          <g className="celestial-spin-slow">
            <polygon
              points="18,6 28.4,12 28.4,24 18,30 7.6,24 7.6,12"
              stroke="#E5C17B"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </g>
          <circle
            cx="18"
            cy="18"
            r="5.5"
            stroke="#FAF6EE"
            strokeWidth="1.25"
          />
          <circle cx="18" cy="18" r="1.6" fill="#E5C17B" />
        </svg>
      );

    case 4:
      // Chapter V: Solar Decree Vector & Compass
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <circle
            cx="14"
            cy="22"
            r="9"
            stroke="rgba(229, 193, 123, 0.42)"
            strokeWidth="1.15"
            strokeDasharray="2.5 2.5"
          />
          <path
            d="M7 29L29 7M29 7H21M29 7V15"
            stroke="#E5C17B"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="29"
            cy="7"
            r="2"
            fill="#FAF6EE"
            className="celestial-breathe"
          />
        </svg>
      );

    case 5:
    default:
      // Chapter VI: Spark of Creation Converging Nodes
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <path
            d="M3.5 21.5C7.8 21.5 10.6 18 14.2 18"
            stroke="#FAF6EE"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M32.5 14.5C28.2 14.5 25.4 18 21.8 18"
            stroke="#E5C17B"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <g className="celestial-breathe">
            <path
              d="M18 10.5V25.5M10.5 18H25.5"
              stroke="#9ED8EB"
              strokeWidth="1.15"
              strokeLinecap="round"
            />
            <circle cx="18" cy="18" r="2.6" fill="#FAF6EE" />
          </g>
        </svg>
      );
  }
}

export function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function LeetCodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M14.5 4.5 7 12l7.5 7.5" />
      <path d="m11 8 4.5-4.5c1.5-1.5 3.5-1 4.5 0s1.5 3 0 4.5L18.5 9.5" />
      <path d="M11 16h9" />
    </svg>
  );
}
