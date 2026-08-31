interface CheckCircleIconProps {
  className?: string;
}

export function CheckCircleIcon({ className }: CheckCircleIconProps) {
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
        <circle cx="100" cy="99" r="95" />
        <rect
          fill="var(--color-bg-tertiary)"
          height="30"
          transform="rotate(-45, 120, 106.321)"
          width="128.85878"
          x="55.57059"
          y="91.32089"
        />
        <rect
          fill="var(--color-bg-tertiary)"
          height="30"
          transform="rotate(45, 66.75, 123.75)"
          width="80.66548"
          x="26.41726"
          y="108.75"
        />
      </g>
    </svg>
  );
}
