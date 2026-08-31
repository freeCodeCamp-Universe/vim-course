interface XCircleIconProps {
  className?: string;
}

export function XCircleIcon({ className }: XCircleIconProps) {
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
      <g transform="scale(0.08)">
        <circle cx="100" cy="99" r="95" fill="currentColor" stroke="currentColor" />
        <rect
          fill="var(--color-bg-tertiary)"
          height="30"
          transform="rotate(-45, 100, 103.321)"
          width="128.85878"
          x="35"
          y="88"
        />
        <rect
          fill="var(--color-bg-tertiary)"
          height="30"
          transform="rotate(45, 99.5, 104)"
          width="128.85878"
          x="35"
          y="88"
        />
      </g>
    </svg>
  );
}
