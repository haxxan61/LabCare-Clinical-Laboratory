import React from "react";

export const Logo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Test tube with blood */}
    <rect x="8" y="10" width="14" height="42" rx="7" stroke="#0F172A" strokeWidth="2.5" fill="#FFFFFF" />
    <rect x="10.5" y="30" width="9" height="19" rx="4" fill="#BE123C" />
    <ellipse cx="15" cy="10" rx="7" ry="2" stroke="#0F172A" strokeWidth="2.5" fill="#FFFFFF" />

    {/* DNA helix (simplified) */}
    <path d="M30 10 Q 38 18 30 26 Q 22 34 30 42 Q 38 50 30 58" stroke="#0D9488" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M44 10 Q 36 18 44 26 Q 52 34 44 42 Q 36 50 44 58" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <line x1="31" y1="14" x2="43" y2="14" stroke="#BE123C" strokeWidth="2" />
    <line x1="31" y1="22" x2="43" y2="22" stroke="#0D9488" strokeWidth="2" />
    <line x1="31" y1="30" x2="43" y2="30" stroke="#BE123C" strokeWidth="2" />
    <line x1="31" y1="38" x2="43" y2="38" stroke="#0D9488" strokeWidth="2" />
    <line x1="31" y1="46" x2="43" y2="46" stroke="#BE123C" strokeWidth="2" />
    <line x1="31" y1="54" x2="43" y2="54" stroke="#0D9488" strokeWidth="2" />

    {/* Microscope lens hint */}
    <circle cx="52" cy="52" r="6" stroke="#0F172A" strokeWidth="2.5" fill="#CCFBF1" />
  </svg>
);
