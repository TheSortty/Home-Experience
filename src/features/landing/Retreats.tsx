import React, { useState, useCallback, useRef } from 'react';
import './Retreats.css';

interface Retreat {
    id: string;
    title: string;
    location: string;
    date: string;
    description: string;
    image: string;
    fullStory: string;
}

const PAST_RETREATS: Retreat[] = [
    {
        id: 'patagonia-2024',
        title: 'Patagonia',
        location: 'San Martín de los Andes, Arg',
        date: 'Octubre 2024',
        description: 'Una inmersión profunda en la naturaleza para reconectar con el propósito en el silencio de los Andes.',
        image: '/images/retreats/retiro-1.jpg',
        fullStory: 'Durante 5 días, un grupo de 20 personas se sumergió en la inmensidad de la Patagonia. Entre fogones, caminatas conscientes y sesiones de introspección, logramos pausar el ruido externo para escuchar lo que realmente importa. Fue una experiencia de transformación profunda que marcó un antes y un después en nuestra comunidad.'
    },
    {
        id: 'uruguay-2024',
        title: 'Costa Este',
        location: 'José Ignacio, Uruguay',
        date: 'Marzo 2024',
        description: 'Procesos de transformación frente al mar, integrando calma y movimiento en la costa uruguaya.',
        image: '/images/retreats/retiro-2.jpg',
        fullStory: 'La costa uruguaya nos recibió con su calma característica. Trabajamos la fluidez y el desapego, inspirados por el ritmo de las olas. Un retiro enfocado en la simplicidad y en encontrar la paz en lo cotidiano, compartiendo momentos únicos frente al océano.'
    },
    {
        id: 'cordoba-2023',
        title: 'Sierras',
        location: 'Villa General Belgrano, Arg',
        date: 'Noviembre 2023',
        description: 'Un encuentro entre las sierras para trabajar el liderazgo consciente y la conexión grupal.',
        image: '/images/retreats/retiro-3.jpg',
        fullStory: 'En el corazón de las sierras cordobesas, exploramos el liderazgo desde un lugar de autenticidad. Fue un retiro de alta intensidad emocional, donde la fuerza del entorno natural potenció cada dinámica grupal y cada momento de silencio.'
    },
    {
        id: 'norte-2023',
        title: 'Puna',
        location: 'Salta, Argentina',
        date: 'Mayo 2023',
        description: 'La inmensidad del norte argentino como escenario para redescubrir la propia esencia.',
        image: '/images/retreats/retiro-4.jpg',
        fullStory: 'Bajo el cielo más puro de la Argentina, caminamos los salares y las montañas de colores. Un retiro de despojo y claridad, donde la altitud y el paisaje nos ayudaron a elevar nuestra perspectiva sobre los desafíos de la vida.'
    },
    {
        id: 'sur-2023',
        title: 'Bosque Andino',
        location: 'Bariloche, Arg',
        date: 'Febrero 2023',
        description: 'La majestuosidad del bosque patagónico como espejo para nuestra propia grandeza interior.',
        image: '/images/retreats/retiro-5.jpg',
        fullStory: 'Rodeados de milenarios arrayanes y coihues, emprendimos un viaje hacia el interior. A través del silencio compartido y dinámicas de integración, sanamos heridas antiguas y conectamos con una vitalidad renovada. El bosque fue testigo y sostén de un proceso inolvidable.'
    }
];

const Retreats: React.FC = React.memo(() => {
    const sliderRef = useRef<HTMLDivElement>(null);
    const [selectedRetreat, setSelectedRetreat] = useState<Retreat | null>(null);

    const handleNext = useCallback(() => {
        if (sliderRef.current) {
            const items = sliderRef.current.querySelectorAll('.retreats-item');
            if (items.length > 0) {
                sliderRef.current.append(items[0]);
            }
        }
    }, []);

    const handlePrev = useCallback(() => {
        if (sliderRef.current) {
            const items = sliderRef.current.querySelectorAll('.retreats-item');
            if (items.length > 0) {
                sliderRef.current.prepend(items[items.length - 1]);
            }
        }
    }, []);

    const handleItemClick = useCallback((index: number, e: React.MouseEvent) => {
        // Since we are moving DOM nodes, index of the map is no longer accurate to visual position.
        // We find the visual position based on the node's current position in the parent.
        const node = e.currentTarget;
        const parent = node.parentNode;
        if (!parent) return;
        const currentIdx = Array.from(parent.children).indexOf(node as Element);
        
        if (currentIdx === 0 || currentIdx === 1) return; // Main items
        handleNext();
    }, [handleNext]);

    return (
        <section id="retreats" className="retreats-carousel-container">
            <div className="retreats-slider" ref={sliderRef}>
                {PAST_RETREATS.map((retreat, index) => (
                    <div
                        key={retreat.id}
                        className="retreats-item"
                        style={{ backgroundImage: `url(${retreat.image})` }}
                        onClick={(e) => handleItemClick(index, e)}
                    >
                        <div className="content">
                            <p className="location">{retreat.date} • {retreat.location}</p>
                            <h2 className="title">{retreat.title}</h2>
                            <p className="description">{retreat.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="retreats-nav">
                <button className="prev" onClick={(e) => { e.stopPropagation(); handlePrev(); }} aria-label="Anterior">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button className="next" onClick={(e) => { e.stopPropagation(); handleNext(); }} aria-label="Siguiente">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
            </div>

            {/* Light Modal */}
            {selectedRetreat && (
                <div className="retreats-modal-overlay" onClick={() => setSelectedRetreat(null)}>
                    <div className="retreats-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="retreats-modal-close" onClick={() => setSelectedRetreat(null)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                        <p className="text-blue-500 font-bold uppercase tracking-widest text-xs mb-4">
                            {selectedRetreat.date} • {selectedRetreat.location}
                        </p>
                        <h3 className="text-4xl font-serif font-bold mb-6 text-slate-900 uppercase">
                            {selectedRetreat.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed text-lg font-light italic mb-8 border-l-4 border-blue-500 pl-6">
                            "{selectedRetreat.description}"
                        </p>
                        <div className="text-slate-700 leading-relaxed space-y-4">
                            {selectedRetreat.fullStory.split('\n').map((paragraph, i) => (
                                <p key={i}>{paragraph}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
});

export default Retreats;
