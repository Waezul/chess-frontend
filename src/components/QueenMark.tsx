/** Flat Staunton-style queen for the site wordmark. Uses currentColor. */
export function QueenMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 1.25 13.65 6l3.85-1.9L16.2 8.5H19.5L18 11H6L4.5 8.5h3.3L6.5 4.1 10.35 6 12 1.25ZM7.1 11.75h9.8l-.85 7.5H7.95l-.85-7.5ZM8.25 20.5h7.5v1.35c0 .55-.45 1-1 1h-5.5c-.55 0-1-.45-1-1V20.5Z"
      />
    </svg>
  )
}
