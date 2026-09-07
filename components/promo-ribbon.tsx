export function PromoRibbon({ label }: { label: string }) {
  return (
    <div className="absolute top-0 left-0 w-40 h-40 pointer-events-none z-30">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))" }}
      >
        <defs>
          <linearGradient id="ribbonBand" x1="0" y1="75" x2="15" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="ribbonFlap" x1="0" y1="90" x2="15" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
        </defs>

        {/* fold flaps — tips land exactly on x=0 and y=0, touching the card's edges */}
        <polygon points="0,60 15,75 0,90" fill="url(#ribbonFlap)" />
        <polygon points="60,0 75,15 90,0" fill="url(#ribbonFlap)" />

        {/* main band, drawn on top of the flaps */}
        <polygon points="0,60 60,0 75,15 15,75" fill="url(#ribbonBand)" />

        <text
          x="37"
          y="42"
          transform="rotate(-45 37 42)"
          textAnchor="middle"
          fill="white"
          fontSize="13"
          fontWeight="800"
        >
          {label}
        </text>
      </svg>
    </div>
  )
}
