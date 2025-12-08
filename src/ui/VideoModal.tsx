import React from 'react';

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoSrc: string;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoSrc }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-7xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                {videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be') ? (
                    <iframe
                        src={`https://www.youtube.com/embed/${videoSrc.split('v=')[1]?.split('&')[0] || videoSrc.split('/').pop()}?autoplay=1&rel=0`}
                        className="w-full h-full"
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                ) : (
                    <video
                        src={videoSrc}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                    />
                )}
            </div>
        </div>
    );
};

export default VideoModal;
