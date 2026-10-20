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
  inbox: 'M3 13h5l1.5 2.5h5L16 13h5M5.5 5h13l2.5 8v6.5H3V13z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6.5 6.5 0 0 1 3.5 6',
  dumbbell: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  cap: 'M2.5 9.5 12 5l9.5 4.5L12 14zM6.5 11.5v4.5c3 2.5 8 2.5 11 0v-4.5M21.5 9.5v5',
  pencil: 'M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19zM14.5 6.5l3 3',
  cart: 'M3 4h2.5l2.2 10.5h10.3l2-7.5H6.4M9.5 19.5h.01M17 19.5h.01',
  phone: 'M5 3.5h4l1.5 4.5-2.5 1.5a11 11 0 0 0 6.5 6.5l1.5-2.5 4.5 1.5v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z',
  gift: 'M3.5 9h17v4h-17zM5 13h14v8H5zM12 9v12M12 9C10.5 5 6 5 6 7.5S10 9 12 9zM12 9c1.5-4 6-4 6-1.5S14 9 12 9z',
  car: 'M5 16.5h14M5.5 16.5V12l2-5h9l2 5v4.5M5.5 16.5v2M18.5 16.5v2M3.5 12h17M8 14h.01M16 14h.01',
  food: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4-3.5 7.5H17',
  coffee: 'M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9.5h1.5a2.5 2.5 0 0 1 0 5H17M7.5 3.5v2M11.5 3.5v2',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  health: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8',
  laptop: 'M4.5 5h15v10.5h-15zM2 19h20',
  game: 'M6 9h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5.4 1.8L15 14H9l-1.6 1.8A3 3 0 0 1 2 14v-1a4 4 0 0 1 4-4zM7.5 11.5v3M6 13h3M16 12.5h.01M18 14h.01',
  home: 'M3.5 11 12 4l8.5 7M5.5 9.5V20h13V9.5',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  book2: 'M12 6.5C10 5 6.5 4.5 3 5v13.5c3.5-.5 7 0 9 1.5 2-1.5 5.5-2 9-1.5V5c-3.5-.5-7 0-9 1.5zM12 6.5V20',
  paw: 'M8 10.5a1.8 2.2 0 1 0 0-4.4 1.8 2.2 0 0 0 0 4.4zM16 10.5a1.8 2.2 0 1 0 0-4.4 1.8 2.2 0 0 0 0 4.4zM4.5 14a1.6 2 0 1 0 0-4 1.6 2 0 0 0 0 4zM19.5 14a1.6 2 0 1 0 0-4 1.6 2 0 0 0 0 4zM12 12.5c-3 0-5 3.5-5 5.5 0 1.5 1.3 2.5 2.8 2.2 1.5-.3 2.9-.3 4.4 0 1.5.3 2.8-.7 2.8-2.2 0-2-2-5.5-5-5.5z',
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
