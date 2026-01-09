import React from 'react';

interface StarIconProps {
  className?: string;
  fill?: 'full' | 'half' | 'none';
}

const StarIcon: React.FC<StarIconProps> = ({ className = "w-6 h-6", fill = 'full' }) => {
  if (fill === 'half') {
    return (
      <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="half-grad">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" stroke="currentColor" />
          </linearGradient>
        </defs>
        <path fill="url(#half-grad)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.563.044.788.746.362 1.133l-4.226 3.86a.562.562 0 00-.17.525l1.282 5.376c.129.544-.462.96-.942.668L12 18.067l-4.944 2.893c-.48.292-1.071-.124-.942-.668l1.282-5.376a.562.562 0 00-.17-.525l-4.226-3.86c-.426-.387-.201-1.089.362-1.133l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    );
  }

  // Outline for 'none', Filled for 'full'
  return (
    <svg className={className} fill={fill === 'full' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={fill === 'full' ? '0' : '1.5'}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.563.044.788.746.362 1.133l-4.226 3.86a.562.562 0 00-.17.525l1.282 5.376c.129.544-.462.96-.942.668L12 18.067l-4.944 2.893c-.48.292-1.071-.124-.942-.668l1.282-5.376a.562.562 0 00-.17-.525l-4.226-3.86c-.426-.387-.201-1.089.362-1.133l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
};

export default StarIcon;
