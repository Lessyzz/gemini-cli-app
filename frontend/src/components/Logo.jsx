import React from 'react';

export const Logo = ({ className = "h-5 w-5" }) => {
  return (
    <svg 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M16 2L18.42 11.58L28 14L18.42 16.42L16 26L13.58 16.42L4 14L13.58 11.58L16 2Z" 
        fill="url(#logo_gradient_1)" 
      />
      <path 
        d="M26 20L26.91 23.59L30.5 24.5L26.91 25.41L26 29L25.09 25.41L21.5 24.5L25.09 23.59L26 20Z" 
        fill="url(#logo_gradient_2)" 
      />
      <defs>
        <linearGradient id="logo_gradient_1" x1="4" y1="2" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4E73FF" />
          <stop offset="1" stopColor="#8E44AD" />
        </linearGradient>
        <linearGradient id="logo_gradient_2" x1="21.5" y1="20" x2="30.5" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4E73FF" />
          <stop offset="1" stopColor="#8E44AD" />
        </linearGradient>
      </defs>
    </svg>
  );
};
