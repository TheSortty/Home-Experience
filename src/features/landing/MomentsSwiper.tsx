import React, { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Navigation } from 'swiper/modules'; // Added Navigation
import 'swiper/css';
import 'swiper/css/effect-cards';
import { ElegantArrowIcon } from './decorations/ElegantDecorations'; // Added Icon Import

import './MomentsSwiper.css';

import VideoModal from '../../ui/VideoModal';

const facilitators = [
    {
        id: 1,
        name: 'Mariano',
        image: '/images/facilitators/maru.jpg', // Swapped: Was mariano.jpg
        title: 'Guía Espiritual',
        description: '"El viaje hacia adentro es el único que verdaderamente transforma." Mariano te acompañará a descubrir tu propia verdad con herramientas profundas de autoconocimiento.',
        videoUrl: 'https://www.youtube.com/watch?v=F-yPgKcgIsw' // Placeholder
    },
    {
        id: 2,
        name: 'Maga',
        image: '/images/facilitators/maga.jpg',
        title: 'Maestra de Energía',
        description: '"Donde pones tu atención, pones tu energía." Maga te enseñará a canalizar tu fuerza interior para manifestar la realidad que deseas.',
        videoUrl: 'https://www.youtube.com/watch?v=F-yPgKcgIsw' // Placeholder
    },
    {
        id: 3,
        name: 'Maru',
        image: '/images/facilitators/mariano.jpg', // Swapped: Was maru.jpg
        title: 'Guardiana del Corazón',
        description: '"Amarse a uno mismo es el comienzo de un romance eterno." Maru crea un espacio seguro donde la vulnerabilidad se convierte en tu mayor fortaleza.',
        videoUrl: 'https://www.youtube.com/watch?v=F-yPgKcgIsw' // Placeholder
    }
];

const MomentsSwiper: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const [currentVideoSrc, setCurrentVideoSrc] = useState('');
    const swiperRef = useRef<any>(null); // Added useRef

    const handlePlayClick = (videoSrc: string) => {
        setCurrentVideoSrc(videoSrc);
        setIsVideoOpen(true);
    };

    return (
        <section className="moments-section" id="moments">
            <div className="moments-content">
                <div className="moments-info">
                    {/* Dynamic Text Section */}
                    {/* Dynamic Text Section */}
                    <div className="fade-text relative" key={activeIndex}>
                        {/* Decorative Quote Icon */}
                        <div className="absolute -top-6 -left-4 opacity-10 text-celeste-strong pointer-events-none">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 7.55228 14.017 7V3H19.017C20.6739 3 22.017 4.34315 22.017 6V15C22.017 16.6569 20.6739 18 19.017 18H16.017V21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 7.55228 5.0166 7V3H10.0166C11.6735 3 13.0166 4.34315 13.0166 6V15C13.0166 16.6569 11.6735 18 10.0166 18H7.0166V21H5.0166Z" />
                            </svg>
                        </div>

                        <h3 className="moments-title-dynamic text-4xl md:text-5xl font-serif text-black-soft mb-2 tracking-tight">
                            {facilitators[activeIndex].name}
                        </h3>

                        {/* Elegant Separator */}
                        <div className="w-24 h-1 bg-gradient-to-r from-celeste-strong to-celeste-soft rounded-full mb-6"></div>

                        <p className="text-grey-800 text-lg md:text-xl font-light italic leading-relaxed relative z-10 pl-2">
                            {facilitators[activeIndex].description}
                        </p>

                        {/* Watch Video Button with Decorative Arrows */}
                        <div className="flex items-center gap-6 mb-8 group cursor-pointer" onClick={() => handlePlayClick(facilitators[activeIndex].videoUrl)}>
                            <svg className="w-6 h-6 text-sand-medium opacity-60 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                            </svg>

                            <button className="flex items-center gap-3 px-6 py-2 bg-white border border-sand-medium/50 rounded-full shadow-sm group-hover:shadow-md group-hover:border-celeste-strong/30 transition-all duration-300">
                                <span className="w-8 h-8 rounded-full bg-celeste-strong/10 flex items-center justify-center text-celeste-strong">
                                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </span>
                                <span className="font-serif font-bold text-black-soft tracking-wide">VER HISTORIA</span>
                            </button>

                            <svg className="w-6 h-6 text-sand-medium opacity-60 transition-transform group-hover:translate-x-1 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                            </svg>
                        </div>
                    </div>

                    {/* Navigation Arrows */}
                    <div className="flex gap-4 mt-2 justify-center md:justify-start">
                        {/* We can't easily access swiper instance here without a ref context or swiper hook inside a child,
                            but we can use custom buttons with class names if we add navigation module,
                            OR use a Swiper reference.
                            Let's use Ref.
                         */}
                        <SwiperButtons swiperRef={swiperRef} />
                    </div>
                </div>

                <div className="moments-swiper-container">
                    <Swiper
                        effect={'cards'}
                        grabCursor={true}
                        modules={[EffectCards, Navigation]} // Removed Mousewheel
                        className="moments-swiper"
                        initialSlide={0}
                        loop={false}
                        onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
                        onSwiper={(swiper) => { swiperRef.current = swiper; }} // Assign swiper instance to ref
                    >
                        {facilitators.map((person) => (
                            <SwiperSlide key={person.id} className="relative group cursor-pointer" onClick={() => handlePlayClick(person.videoUrl)}>
                                <img src={person.image} alt={person.name} />
                                <div className="slide-overlay transition-opacity duration-300">
                                    {/* Play Button Overlay - Simplified/Removed text per request */}
                                    <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/10">
                                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 shadow-xl transition-transform transform group-hover:scale-110">
                                            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Removed Text/Icon Overlay at bottom right as requested */}
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>

            <ul className="circles">
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
            </ul>

            <VideoModal
                isOpen={isVideoOpen}
                onClose={() => setIsVideoOpen(false)}
                videoSrc={currentVideoSrc}
            />
        </section>
    );
};

// Internal component to access Swiper context
const SwiperButtons = ({ swiperRef }: { swiperRef: React.MutableRefObject<any> }) => {
    // Note: useSwiper() only works INSIDE Swiper component.
    // Since buttons are outside, we need a Ref approach for the parent.
    // We can now use the passed swiperRef to control the Swiper instance.
    return (
        <>
            <button
                className="swiper-button-prev-custom w-12 h-12 rounded-full flex items-center justify-center bg-slate-800 text-white hover:bg-slate-700 shadow-lg transition-all duration-300"
                onClick={() => swiperRef.current?.slidePrev()}
            >
                <ElegantArrowIcon direction="left" />
            </button>
            <button
                className="swiper-button-next-custom w-12 h-12 rounded-full flex items-center justify-center bg-slate-800 text-white hover:bg-slate-700 shadow-lg transition-all duration-300"
                onClick={() => swiperRef.current?.slideNext()}
            >
                <ElegantArrowIcon direction="right" />
            </button>
        </>
    );
};

export default MomentsSwiper;
