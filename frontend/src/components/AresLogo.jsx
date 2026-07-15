

export default function AresLogo({ className = "w-8 h-8 text-white" }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Targeting Ring */}
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" strokeDasharray="10 4" opacity="0.3" />
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" strokeDasharray="2 12" />
      
      {/* Inner Hexagon Core */}
      <polygon 
        points="50,15 80,32 80,68 50,85 20,68 20,32" 
        stroke="currentColor" 
        strokeWidth="4" 
        fill="transparent"
      />
      
      {/* Central 'A' Apex */}
      <path 
        d="M50 25 L65 70 L35 70 Z" 
        fill="currentColor" 
      />
      <path 
        d="M40 55 L60 55" 
        stroke="#000" 
        strokeWidth="4" 
      />
    </svg>
  );
}
