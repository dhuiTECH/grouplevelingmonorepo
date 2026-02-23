import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  external?: boolean;
  variant?: 'primary' | 'secondary' | 'cta' | 'form';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export default function Button({
  children,
  href,
  external = false,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  type = 'button',
  disabled = false,
}: ButtonProps) {
  const baseStyles = 'font-bold transition-all flex items-center justify-center gap-2 active:scale-95';

  const variants = {
    primary: 'bg-slate-800 hover:bg-slate-900 text-white shadow-md hover:shadow-lg',
    secondary: 'bg-white border-2 border-slate-200 hover:border-teal-200 text-slate-700 hover:bg-slate-50',
    cta: 'bg-orange-400 hover:bg-orange-500 text-white shadow-sm hover:shadow-md',
    form: 'w-full bg-slate-800 hover:bg-slate-900 text-white shadow-md hover:shadow-lg',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 text-base rounded-xl',
    lg: 'px-8 py-4 text-lg rounded-2xl',
  };

  const buttonClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  const content = (
    <>
      {children}
      {external && <ExternalLink className="w-6 h-6" />}
    </>
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses}
        >
          {content}
        </a>
      );
    }

    return (
      <Link href={href} className={buttonClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {content}
    </button>
  );
}
