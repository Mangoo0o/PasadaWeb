import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm transition-all duration-200 ${
        hoverable ? 'hover:shadow-md hover:border-brand-500/40 cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
