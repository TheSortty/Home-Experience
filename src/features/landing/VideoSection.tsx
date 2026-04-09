import React, { useState } from 'react';
import Image from 'next/image';

const VideoSection: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoId = "Usht_kWIkiY";

  return (
    <section className="w-full relative overflow-hidden py-12">
      <div className="relative aspect-video w-full max-w-7xl mx-auto rounded-[32px] overflow-hidden shadow-2xl bg-black">
        {!isPlaying ? (
          <div className="absolute inset-0 cursor-pointer group flex items-center justify-center" onClick={() => setIsPlaying(true)}>
            <Image
              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
              alt="Miniatura del video de HOME Experience"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
            <button aria-label="Reproducir video" className="relative z-10 w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 shadow-xl transition-transform transform group-hover:scale-110">
              <svg className="w-8 h-8 text-white ml-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        ) : (
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1`}
            title="YouTube video player"
            allow="autoplay"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          ></iframe>
        )}
      </div>
    </section>
  );
};

export default VideoSection;