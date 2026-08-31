interface CircleIconProps {
  className?: string;
}

export function CircleIcon({ className }: CircleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 16 16"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="8" cy="8" r="7.6" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}
