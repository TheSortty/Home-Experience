import React, { useState, useRef, useEffect } from 'react';
import { ElegantArrowIcon } from './decorations/ElegantDecorations';

const videos = [
  {
    id: 1,
    title: "Conexión",
    src: "https://res.cloudinary.com/dgduc73hq/video/upload/v1762979185/9038530-uhd_2160_4096_25fps_oihkyz.mp4",
  },
  {
    id: 2,
    title: "Ruptura",
    src: "https://res.cloudinary.com/dgduc73hq/video/upload/v1762978960/6719636-uhd_2160_3840_25fps_wigfgj.mp4",
  },
  {
    id: 3,
    title: "Renacer",
    src: "https://res.cloudinary.com/dgduc73hq/video/upload/v1762978209/6275800-uhd_2160_4096_25fps_ynspp6.mp4",
  }
];

const VideoCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === activeIndex) {
          video.play().catch(e => console.log("Autoplay prevented:", e));
        } else {
          video.pause();
          video.currentTime = 0; // Optional: reset others
        }
      }
    });
  }, [activeIndex]);

  const scrollToVideo = (index: number) => {
    isScrollingRef.current = true;
    setActiveIndex(index);
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const videoCards = container.children;
      if (videoCards[index]) {
        const card = videoCards[index] as HTMLElement;
        const containerWidth = container.offsetWidth;
        const cardWidth = card.offsetWidth;
        const scrollLeft = card.offsetLeft - (containerWidth / 2) + (cardWidth / 2);

        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });

        // Unlock after animation
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 600);
      }
    }
  };

  const handleScroll = () => {
    if (isScrollingRef.current) return;

    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollCenter = container.scrollLeft + (container.offsetWidth / 2);

      let closestIndex = 0;
      let minDistance = Infinity;

      Array.from(container.children).forEach((child, index) => {
        const card = child as HTMLElement;
        const cardCenter = card.offsetLeft + (card.offsetWidth / 2);
        const distance = Math.abs(scrollCenter - cardCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      if (closestIndex !== activeIndex) {
        setActiveIndex(closestIndex);
      }
    }
  };

  return (
    <section className="py-24 overflow-hidden">
      <div className="container mx-auto px-6 mb-12">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">
          Momentos del<br />
          <span className="text-slate-400">camino interior</span>
        </h2>

        <div className="flex justify-end gap-2 mt-8">
          <button
            onClick={() => scrollToVideo(activeIndex === 0 ? videos.length - 1 : activeIndex - 1)}
            className="w-12 h-12 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <ElegantArrowIcon direction="left" />
          </button>
          <button
            onClick={() => scrollToVideo(activeIndex === videos.length - 1 ? 0 : activeIndex + 1)}
            className="w-12 h-12 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <ElegantArrowIcon direction="right" />
          </button>
        </div>
      </div>

      {/* Carousel Track */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-8 px-6 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-10"
        style={{ scrollBehavior: 'smooth' }}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            onClick={() => scrollToVideo(index)}
            className={`flex-shrink-0 w-[80vw] md:w-[600px] snap-center transition-all duration-500 cursor-pointer ${index === activeIndex ? 'scale-100 opacity-100' : 'scale-95 opacity-50 hover:opacity-75'}`}
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[16/9] relative group bg-transparent">
              <video
                ref={el => (videoRefs.current[index] = el)}
                src={video.src}
                loop
                muted
                playsInline
                className="w-full h-full object-cover outline-none border-none bg-transparent"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-2xl font-bold font-serif">{video.title}</h3>
              </div>
              {/* Play Button Indicator for non-active videos */}
              {index !== activeIndex && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[16px] border-l-white border-b-8 border-b-transparent ml-1"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default VideoCarousel;