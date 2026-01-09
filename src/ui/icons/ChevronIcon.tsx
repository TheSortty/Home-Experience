import React from 'react';

const ChevronIcon: React.FC<{ className?: string; direction?: 'up' | 'down' }> = ({ className = "w-5 h-5", direction = 'down' }) => (
    <svg
        className={`${className} transition-transform duration-300 ${direction === 'up' ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

export default ChevronIcon;
