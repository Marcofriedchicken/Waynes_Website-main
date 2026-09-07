function wrapTitle(title: string, maxCharsPerLine = 16, maxLines = 2): string[] {
  const words = title.toUpperCase().split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxCharsPerLine) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = kept[maxLines - 1].replace(/…$/, "") + "…"
    return kept
  }
  return lines
}

export function PromoRibbon({
  title,
  discount,
  endDate,
}: {
  title: string
  discount: string
  endDate?: string
}) {
  const titleLines = wrapTitle(title)
  const hasTwoLines = titleLines.length === 2

  return (
    <div className="absolute top-0 left-0 w-64 h-64 pointer-events-none z-30">
      <svg
        viewBox="0 0 175 175"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.45))" }}
      >
        <defs>
          <linearGradient
            id="ribbonGrad"
            x1="0" y1="112" x2="52" y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* fold flaps and band all share the SAME gradient fill, in the
            same coordinate space, so the color reads continuously across
            the whole ribbon instead of looking like two separate pieces */}
        <polygon points="0,60 52,112 0,164" fill="url(#ribbonGrad)" />
        <polygon points="60,0 112,52 164,0" fill="url(#ribbonGrad)" />
        <polygon points="0,60 60,0 112,52 52,112" fill="url(#ribbonGrad)" />

        <g transform="rotate(-45 56 56)">
          {titleLines.map((line, i) => {
            const needsCompression = line.length > 12
            return (
              <text
                key={i}
                x="56"
                y={hasTwoLines ? 28 + i * 13 : 32}
                textAnchor="middle"
                fill="white"
                fontSize={hasTwoLines ? "9" : "11"}
                fontWeight="700"
                letterSpacing="0.5"
                {...(needsCompression
                  ? { textLength: "76", lengthAdjust: "spacing" }
                  : {})}
              >
                {line}
              </text>
            )
          })}
          <text
            x="56"
            y={hasTwoLines ? 68 : 62}
            textAnchor="middle"
            fill="white"
            fontSize={hasTwoLines ? "22" : "27"}
            fontWeight="900"
          >
            {discount}
          </text>
          {endDate && (
            <text
              x="56"
              y={hasTwoLines ? 84 : 78}
              textAnchor="middle"
              fill="white"
              fontSize={hasTwoLines ? "8" : "9"}
              fontWeight="600"
              opacity="0.85"
            >
              Ends {endDate}
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}
