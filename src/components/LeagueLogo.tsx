import React from 'react';
import logoSrc from '../assets/logo.webp';

interface LeagueLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClassMap: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-32 h-32',
  md: 'w-48 h-48',
  lg: 'w-64 h-64',
};

const LeagueLogo: React.FC<LeagueLogoProps> = ({ size = 'md', className = '' }) => {
  return (
    <img
      src={logoSrc}
      alt="Логотип Лиги"
      className={`object-contain select-none flex-shrink-0 ${sizeClassMap[size]} ${className}`}
      draggable={false}
    />
  );
};

export default LeagueLogo;
