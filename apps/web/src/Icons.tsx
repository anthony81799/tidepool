import type { Library } from "@tidepool/core";
import type { ReactNode } from "react";

type IconProps = { size?: number };

function Svg({ size = 20, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

export function FilmIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </Svg>
  );
}

export function TvIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="m8 2 4 4 4-4M8 21h8" />
    </Svg>
  );
}

export function MusicIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </Svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 5 8 12l7 7" />
    </Svg>
  );
}

export function LibraryIcon({ type, ...props }: IconProps & { type: Library["type"] }) {
  switch (type) {
    case "movies":
      return <FilmIcon {...props} />;
    case "tvshows":
      return <TvIcon {...props} />;
    case "music":
      return <MusicIcon {...props} />;
    case "books":
      return <BookIcon {...props} />;
  }
}

export function Mark({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <radialGradient id="mark-pool" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#2bb3b8" />
          <stop offset="0.55" stopColor="#0e6e78" />
          <stop offset="1" stopColor="#0c2b33" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#mark-pool)" />
      <path
        d="M4.5 7c2.4-1.4 4.6-1.4 7 0s4.6 1.4 7 0 4.6-1.4 7 0"
        fill="none"
        stroke="#bfeeee"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
      />
      <polygon
        points="16.0,10.4 18.2,15.9 24.2,16.3 19.6,20.2 21.1,26.0 16.0,22.8 10.9,26.0 12.4,20.2 7.8,16.3 13.8,15.9"
        fill="#ff7a59"
        stroke="#ff7a59"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
