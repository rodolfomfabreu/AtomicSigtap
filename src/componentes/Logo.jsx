import React from 'react';

// Marca: o "átomo" da Atomic em traço fino
export default function Logo({ tamanho = 30 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="var(--acento)" />
      <circle cx="32" cy="32" r="5.5" fill="var(--papel)" />
      {[0, 60, 120].map((g) => (
        <ellipse key={g} cx="32" cy="32" rx="21" ry="8.5" fill="none" stroke="var(--papel)" strokeWidth="2.6" transform={`rotate(${g} 32 32)`} />
      ))}
    </svg>
  );
}
