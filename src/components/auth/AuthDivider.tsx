import React from 'react';

interface AuthDividerProps {
  text?: string;
  className?: string;
}

export default function AuthDivider({ text = 'OR', className = '' }: AuthDividerProps) {
  return (
    <div className={`feeder-auth-divider ${className}`} role="separator" aria-label={text}>
      <span className="feeder-auth-divider-line" aria-hidden="true" />
      <span className="feeder-auth-divider-text">{text}</span>
      <span className="feeder-auth-divider-line" aria-hidden="true" />
    </div>
  );
}
