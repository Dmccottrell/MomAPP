// Small inline line icons, drawn directly rather than pulled from a sprite
// or library — there are only a handful, and currentColor lets them follow
// the theme automatically.

const common = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function HomeIcon(props) {
  return (
    <svg {...common} {...props}>
      <path d="M3 9.5 10 3l7 6.5" />
      <path d="M5 8v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8" />
    </svg>
  );
}

export function HistoryIcon(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="10" cy="10.5" r="6.5" />
      <path d="M10 7v3.5l2.5 1.5" />
      <path d="M7 2.5h6" />
    </svg>
  );
}

export function SettingsIcon(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.8v2.1M10 15.1v2.1M17.2 10h-2.1M4.9 10H2.8M15.1 4.9l-1.5 1.5M6.4 13.6l-1.5 1.5M15.1 15.1l-1.5-1.5M6.4 6.4 4.9 4.9" />
    </svg>
  );
}

export function PencilIcon(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12.5 3.5 16.5 7.5 6.5 17.5 2.5 18.5 3.5 14.5Z" />
      <path d="M11 5l4 4" />
    </svg>
  );
}

export function InfoIcon(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9.2v4.3" />
      <path d="M10 6.8v.1" />
    </svg>
  );
}

export function MenuIcon(props) {
  return (
    <svg {...common} {...props}>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg {...common} {...props}>
      <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" />
    </svg>
  );
}

export function ChevronIcon(props) {
  return (
    <svg {...common} {...props}>
      <path d="M7 4.5 13 10l-6 5.5" />
    </svg>
  );
}
