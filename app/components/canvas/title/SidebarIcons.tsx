import React from 'react';

interface SidebarIconProps {
  iconType: string;
  hasChildren: boolean;
  isActive: boolean;
}

export const SidebarIcon: React.FC<SidebarIconProps> = ({ iconType, hasChildren, isActive }) => {
  const iconStyle = { 
    width: '16px', height: '16px', stroke: 'currentColor', 
    strokeWidth: '1.8', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const 
  };
  
  if (iconType === 'about') return (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
  if (iconType === 'skill') return (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
    </svg>
  );
  if (hasChildren) {
    return isActive ? (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <path d="M2 19V5a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v1M2 19h20M2 19l2-8h18l-2 8H4z"></path>
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" style={iconStyle}>
        <path d="M22 19a2 2 0 0 1-2-2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" style={iconStyle}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>
  );
};