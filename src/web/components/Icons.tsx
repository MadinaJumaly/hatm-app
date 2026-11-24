// Inline stroke icons from the mockups. Always next to text, so hidden from screen readers.

type IconProps = { size?: number; strokeWidth?: number };

function Svg({
  size = 18,
  strokeWidth = 2,
  children,
}: IconProps & { children: preact.ComponentChildren }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const CheckIcon = (props: IconProps) => (
  <Svg strokeWidth={2.5} {...props}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

export const BackIcon = (props: IconProps) => (
  <Svg size={22} strokeWidth={2.2} {...props}>
    <path d="M15 18l-6-6 6-6" />
  </Svg>
);

export const RefreshIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </Svg>
);
