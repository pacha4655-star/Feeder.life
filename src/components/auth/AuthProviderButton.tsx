'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export interface AuthProviderButtonProps {
  variant: 'email' | 'google' | 'apple' | 'create';
  label: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  href?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}

export default function AuthProviderButton({
  variant,
  label,
  icon,
  rightIcon,
  onClick,
  href,
  disabled = false,
  isLoading = false,
  className = '',
  type = 'button',
  'aria-label': ariaLabel,
}: AuthProviderButtonProps) {
  const baseClasses = `feeder-auth-provider-btn feeder-auth-btn-${variant} ${className}`;

  const content = (
    <>
      <span className="feeder-auth-btn-icon-slot" aria-hidden="true">
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : icon}
      </span>
      <span className="feeder-auth-btn-label">{label}</span>
      <span className="feeder-auth-btn-right-slot" aria-hidden="true">
        {rightIcon}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={baseClasses}
        aria-label={ariaLabel || label}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={baseClasses}
      aria-label={ariaLabel || label}
    >
      {content}
    </button>
  );
}
