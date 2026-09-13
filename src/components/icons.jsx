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

export function LockIcon(props) {
  return (
    <svg {...common} {...props}>
      <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />
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

export function TrashIcon(props) {
  return (
    <svg {...common} {...props}>
      <path d="M4 6h12" />
      <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6" />
      <path d="M5.5 6 6.2 16a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L14.5 6" />
    </svg>
  );
}
