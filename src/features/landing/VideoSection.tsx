import React from 'react';

const VideoSection: React.FC = () => {
  const videoId = "F-yPgKcgIsw";

  return (
    <section className="w-full relative overflow-hidden py-12">
      <div className="relative aspect-video w-full max-w-7xl mx-auto rounded-[32px] overflow-hidden shadow-2xl bg-black">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        ></iframe>
      </div>
    </section>
  );
};

export default VideoSection;