import React from 'react';
import DynamicLines from '../../ui/backgrounds/DynamicLines';

const InteractiveBg: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-white">
            <DynamicLines />
        </div>
    );
};

export default InteractiveBg;
