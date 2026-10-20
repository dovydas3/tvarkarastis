// Paprastos linijinės ikonos (24x24, stroke), kad nepriklausytų nuo šrifto glifų.
const PATHS = {
  today: 'M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  week: 'M4 5h16v14H4zM9.33 5v14M14.67 5v14',
  month: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01',
  practice: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  more: 'M4 7h16M4 12h16M4 17h16',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  alert: 'M12 4 2.5 20h19L12 4zM12 10v4M12 17h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  book: 'M4.5 19.5v-15A2.5 2.5 0 0 1 7 2h12.5v20H7a2.5 2.5 0 0 1 0-5h12.5',
  briefcase: 'M3.5 8h17v11.5h-17zM8.5 8V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2M3.5 13h17',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z',
  close: 'M6 6l12 12M18 6 6 18',
  trash: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13',
  repeat: 'M17 2.5l3 3-3 3M4 11.5v-1a5 5 0 0 1 5-5h11M7 21.5l-3-3 3-3M20 12.5v1a5 5 0 0 1-5 5H4',
  note: 'M5 4h14v16H5zM8.5 9h7M8.5 13h7M8.5 17h4',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  cloud: 'M7 18.5a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.6 1.5A4 4 0 0 1 17.5 18.5z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'h-6 w-6', strokeWidth = 2 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
