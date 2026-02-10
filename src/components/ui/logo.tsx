// Obra Tracker Logo - Industrial Modern Design
export const ObraTrackerLogo = ({ className = "h-8 w-auto" }: { className?: string }) => (
  <svg
    viewBox="0 0 200 60"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background grid pattern for technical feel */}
    <defs>
      <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M 4 0 L 0 0 0 4" fill="none" stroke="currentColor" strokeWidth="0.2" opacity="0.1"/>
      </pattern>
      <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>

    {/* Technical grid background */}
    <rect width="200" height="60" fill="url(#grid)" />

    {/* Main geometric symbol - represents construction/tracking */}
    <g transform="translate(15, 15)">
      {/* Central construction symbol */}
      <rect x="0" y="0" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" rx="2"/>
      <rect x="5" y="5" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1" rx="1"/>
      <circle cx="15" cy="15" r="8" fill="none" stroke="url(#orangeGradient)" strokeWidth="2"/>
      <line x1="15" y1="7" x2="15" y2="23" stroke="url(#orangeGradient)" strokeWidth="1.5"/>
      <line x1="7" y1="15" x2="23" y2="15" stroke="url(#orangeGradient)" strokeWidth="1.5"/>
    </g>

    {/* Text elements */}
    <text
      x="55"
      y="25"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="18"
      fontWeight="900"
      fill="currentColor"
      letterSpacing="0.02em"
    >
      OBRA
    </text>
    <text
      x="55"
      y="42"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="12"
      fontWeight="700"
      fill="url(#orangeGradient)"
      letterSpacing="0.05em"
      opacity="0.9"
    >
      TRACKER
    </text>

    {/* Technical accent line */}
    <line x1="50" y1="48" x2="180" y2="48" stroke="url(#orangeGradient)" strokeWidth="0.5" opacity="0.6"/>
  </svg>
);

// Compact version for sidebar/mobile
export const ObraTrackerLogoCompact = ({ className = "h-6 w-auto" }: { className?: string }) => (
  <svg
    viewBox="0 0 120 40"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="compactOrange" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>

    {/* Compact symbol */}
    <g transform="translate(5, 8)">
      <rect x="0" y="0" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.2" rx="1.5"/>
      <circle cx="12" cy="12" r="6" fill="none" stroke="url(#compactOrange)" strokeWidth="1.5"/>
      <line x1="12" y1="6" x2="12" y2="18" stroke="url(#compactOrange)" strokeWidth="1.2"/>
      <line x1="6" y1="12" x2="18" y2="12" stroke="url(#compactOrange)" strokeWidth="1.2"/>
    </g>

    {/* Compact text */}
    <text
      x="35"
      y="18"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="14"
      fontWeight="900"
      fill="currentColor"
    >
      OBRA
    </text>
    <text
      x="35"
      y="30"
      fontFamily="system-ui, -apple-system, sans-serif"
      fontSize="9"
      fontWeight="700"
      fill="url(#compactOrange)"
      letterSpacing="0.02em"
    >
      TRACKER
    </text>
  </svg>
);
