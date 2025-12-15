import React, { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Navigation } from 'swiper/modules'; // Added Navigation
import 'swiper/css';
import 'swiper/css/effect-cards';
import { ElegantArrowIcon } from './decorations/ElegantDecorations'; // Added Icon Import

import './MomentsSwiper.css';

const facilitators = [
    {
        id: 1,
        name: 'Mariano',
        image: '/images/facilitators/maru.jpg', // Swapped: Was mariano.jpg
        title: 'Guía Espiritual',
        description: '"El viaje hacia adentro es el único que verdaderamente transforma." Mariano te acompañará a descubrir tu propia verdad con herramientas profundas de autoconocimiento.'
    },
    {
        id: 2,
        name: 'Maga',
        image: '/images/facilitators/maga.jpg',
        title: 'Maestra de Energía',
        description: '"Donde pones tu atención, pones tu energía." Maga te enseñará a canalizar tu fuerza interior para manifestar la realidad que deseas.'
    },
    {
        id: 3,
        name: 'Maru',
        image: '/images/facilitators/mariano.jpg', // Swapped: Was maru.jpg
        title: 'Guardiana del Corazón',
        description: '"Amarse a uno mismo es el comienzo de un romance eterno." Maru crea un espacio seguro donde la vulnerabilidad se convierte en tu mayor fortaleza.'
    }
];

const MomentsSwiper: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const swiperRef = useRef<any>(null); // Added useRef

    return (
        <section className="moments-section" id="moments">
            <div className="moments-content">
                <div className="moments-info">
                    {/* Dynamic Text Section */}
                    <div className="fade-text" key={activeIndex}>
                        <h3 className="moments-title-dynamic">
                            {facilitators[activeIndex].name}
                        </h3>
                        <p>
                            {facilitators[activeIndex].description}
                        </p>
                    </div>

                    {/* Navigation Arrows */}
                    <div className="flex gap-4 mt-6 justify-center md:justify-start">
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
                            <SwiperSlide key={person.id}>
                                <img src={person.image} alt={person.name} />
                                <div className="slide-overlay">
                                    {/* Swapped layout: Role at bottom near name */}
                                    <div className="absolute bottom-0 left-0 p-6 w-full text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                        <span className="text-sm uppercase tracking-widest font-medium opacity-90">{person.title}</span>
                                    </div>
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
