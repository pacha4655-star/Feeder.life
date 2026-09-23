'use client';

import React, { useState } from 'react';
import { User } from 'lucide-react';

interface FeederAvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function FeederAvatar({
  src,
  alt = 'User avatar',
  size = 40,
  className = '',
  style = {},
}: FeederAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // If valid src and not errored
  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setImageError(true)}
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'inline-block',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  // Fallback default avatar
  return (
    <div
      className={`feeder-default-avatar ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: 'var(--bg-secondary, #E2E8F0)',
        color: 'var(--text-muted, #64748B)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border-subtle, #CBD5E1)',
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
      title={alt}
      aria-label={alt}
    >
      <User size={Math.round(size * 0.52)} />
    </div>
  );
}
