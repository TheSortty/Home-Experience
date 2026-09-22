import React from 'react';

interface StarRatingInputProps {
    value: number;
    onChange: (value: number) => void;
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({ value, onChange }) => {
    return (
        <>
            <style>{`
        .rating-container * {
          border: 0;
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .rating-container {
            --hue: 223;
            --starHue: 38;
            --bg: hsl(var(--hue),10%,90%);
            --fg: hsl(var(--hue),10%,10%);
            --primary: hsl(var(--hue),90%,55%);
            --yellow: hsl(var(--starHue),90%,55%);
            --yellow-t: hsla(var(--starHue),90%,55%,0);
            --bezier: cubic-bezier(0.42,0,0.58,1);
            --trans-dur: 0.3s;
        }

        .rating {
          margin: auto;
        }

        .rating__display {
          font-size: 1em;
          font-weight: 500;
          min-height: 1.25em;
          position: absolute;
          top: 100%;
          width: 100%;
          text-align: center;
        }

        .rating__stars {
          display: flex;
          padding-bottom: 0.375em;
          position: relative;
        }

        .rating__star {
          display: block;
          overflow: visible;
          pointer-events: none;
          width: 2em;
          height: 2em;
        }

        .rating__star-ring,
        .rating__star-fill,
        .rating__star-line,
        .rating__star-stroke {
          animation-duration: 1s;
          animation-timing-function: ease-in-out;
          animation-fill-mode: forwards;
        }

        .rating__star-ring,
        .rating__star-fill,
        .rating__star-line {
          stroke: var(--yellow);
        }

        .rating__star-fill {
          fill: var(--yellow);
          transform: scale(0);
          transition: fill var(--trans-dur) var(--bezier), transform var(--trans-dur) var(--bezier);
        }

        .rating__star-line {
          stroke-dasharray: 12 13;
          stroke-dashoffset: -13;
        }

        .rating__star-stroke {
          stroke: #c7c7c7; /* Adjusted for light mode visibility */
          transition: stroke var(--trans-dur);
        }

        .rating__label {
          cursor: pointer;
          padding: 0.125em;
        }

        /* Delays */
        .rating__label--delay1 .rating__star-ring, .rating__label--delay1 .rating__star-fill, .rating__label--delay1 .rating__star-line, .rating__label--delay1 .rating__star-stroke { animation-delay: 0.05s; }
        .rating__label--delay2 .rating__star-ring, .rating__label--delay2 .rating__star-fill, .rating__label--delay2 .rating__star-line, .rating__label--delay2 .rating__star-stroke { animation-delay: 0.1s; }
        .rating__label--delay3 .rating__star-ring, .rating__label--delay3 .rating__star-fill, .rating__label--delay3 .rating__star-line, .rating__label--delay3 .rating__star-stroke { animation-delay: 0.15s; }
        .rating__label--delay4 .rating__star-ring, .rating__label--delay4 .rating__star-fill, .rating__label--delay4 .rating__star-line, .rating__label--delay4 .rating__star-stroke { animation-delay: 0.2s; }
        .rating__label--delay5 .rating__star-ring, .rating__label--delay5 .rating__star-fill, .rating__label--delay5 .rating__star-line, .rating__label--delay5 .rating__star-stroke { animation-delay: 0.25s; }

        .rating__input {
          position: absolute;
          -webkit-appearance: none;
          appearance: none;
        }

        /* Hover Effects */
        .rating__input:hover ~ [data-rating]:not([hidden]) { display: none; }
        .rating__input-1:hover ~ [data-rating="1"][hidden], .rating__input-2:hover ~ [data-rating="2"][hidden], .rating__input-3:hover ~ [data-rating="3"][hidden], .rating__input-4:hover ~ [data-rating="4"][hidden], .rating__input-5:hover ~ [data-rating="5"][hidden], .rating__input:checked:hover ~ [data-rating]:not([hidden]) { display: block; }

        .rating__input-1:hover ~ .rating__label:nth-of-type(1) .rating__star-stroke,
        .rating__input-2:hover ~ .rating__label:nth-of-type(-n + 2) .rating__star-stroke,
        .rating__input-3:hover ~ .rating__label:nth-of-type(-n + 3) .rating__star-stroke,
        .rating__input-4:hover ~ .rating__label:nth-of-type(-n + 4) .rating__star-stroke,
        .rating__input-5:hover ~ .rating__label:nth-of-type(-n + 5) .rating__star-stroke {
          stroke: var(--yellow);
          transform: scale(1);
        }

        /* Checked States */
        .rating__input-1:checked ~ .rating__label:nth-of-type(1) .rating__star-ring,
        .rating__input-2:checked ~ .rating__label:nth-of-type(-n + 2) .rating__star-ring,
        .rating__input-3:checked ~ .rating__label:nth-of-type(-n + 3) .rating__star-ring,
        .rating__input-4:checked ~ .rating__label:nth-of-type(-n + 4) .rating__star-ring,
        .rating__input-5:checked ~ .rating__label:nth-of-type(-n + 5) .rating__star-ring { animation-name: starRing; }

        .rating__input-1:checked ~ .rating__label:nth-of-type(1) .rating__star-stroke,
        .rating__input-2:checked ~ .rating__label:nth-of-type(-n + 2) .rating__star-stroke,
        .rating__input-3:checked ~ .rating__label:nth-of-type(-n + 3) .rating__star-stroke,
        .rating__input-4:checked ~ .rating__label:nth-of-type(-n + 4) .rating__star-stroke,
        .rating__input-5:checked ~ .rating__label:nth-of-type(-n + 5) .rating__star-stroke { animation-name: starStroke; }

        .rating__input-1:checked ~ .rating__label:nth-of-type(1) .rating__star-line,
        .rating__input-2:checked ~ .rating__label:nth-of-type(-n + 2) .rating__star-line,
        .rating__input-3:checked ~ .rating__label:nth-of-type(-n + 3) .rating__star-line,
        .rating__input-4:checked ~ .rating__label:nth-of-type(-n + 4) .rating__star-line,
        .rating__input-5:checked ~ .rating__label:nth-of-type(-n + 5) .rating__star-line { animation-name: starLine; }

        .rating__input-1:checked ~ .rating__label:nth-of-type(1) .rating__star-fill,
        .rating__input-2:checked ~ .rating__label:nth-of-type(-n + 2) .rating__star-fill,
        .rating__input-3:checked ~ .rating__label:nth-of-type(-n + 3) .rating__star-fill,
        .rating__input-4:checked ~ .rating__label:nth-of-type(-n + 4) .rating__star-fill,
        .rating__input-5:checked ~ .rating__label:nth-of-type(-n + 5) .rating__star-fill { animation-name: starFill; }

        /* Unchecked Hover */
        .rating__input-1:not(:checked):hover ~ .rating__label:nth-of-type(1) .rating__star-fill,
        .rating__input-2:not(:checked):hover ~ .rating__label:nth-of-type(2) .rating__star-fill,
        .rating__input-3:not(:checked):hover ~ .rating__label:nth-of-type(3) .rating__star-fill,
        .rating__input-4:not(:checked):hover ~ .rating__label:nth-of-type(4) .rating__star-fill,
        .rating__input-5:not(:checked):hover ~ .rating__label:nth-of-type(5) .rating__star-fill {
          fill: var(--yellow-t);
        }

        .rating__sr {
          clip: rect(1px,1px,1px,1px);
          overflow: hidden;
          position: absolute;
          width: 1px;
          height: 1px;
        }

        /* Animations */
        @keyframes starRing {
          from, 20% { animation-timing-function: ease-in; opacity: 1; r: 8px; stroke-width: 16px; transform: scale(0); }
          35% { animation-timing-function: ease-out; opacity: 0.5; r: 8px; stroke-width: 16px; transform: scale(1); }
          50%, to { opacity: 0; r: 16px; stroke-width: 0; transform: scale(1); }
        }
        @keyframes starFill {
          from, 40% { animation-timing-function: ease-out; transform: scale(0); }
          60% { animation-timing-function: ease-in-out; transform: scale(1.2); }
          80% { transform: scale(0.9); }
          to { transform: scale(1); }
        }
        @keyframes starStroke {
          from { transform: scale(1); }
          20%, to { transform: scale(0); }
        }
        @keyframes starLine {
          from, 40% { animation-timing-function: ease-out; stroke-dasharray: 1 23; stroke-dashoffset: 1; }
          60%, to { stroke-dasharray: 12 13; stroke-dashoffset: -13; }
        }
      `}</style>

            <div className="rating-container">
                <form className="rating" onSubmit={e => e.preventDefault()}>
                    <div className="rating__stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <React.Fragment key={star}>
                                <input
                                    id={`rating-${star}`}
                                    className={`rating__input rating__input-${star}`}
                                    type="radio"
                                    name="rating"
                                    value={star}
                                    checked={value === star}
                                    onChange={() => onChange(star)}
                                />
                            </React.Fragment>
                        ))}

                        {[1, 2, 3, 4, 5].map((star) => (
                            <label key={star} className={`rating__label ${value >= star ? `rating__label--delay${star}` : ''}`} htmlFor={`rating-${star}`}>
                                <svg className="rating__star" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
                                    <g transform="translate(16,16)">
                                        <circle className="rating__star-ring" fill="none" stroke="#000" strokeWidth="16" r="8" transform="scale(0)" />
                                    </g>
                                    <g stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <g transform="translate(16,16) rotate(180)">
                                            <polygon className="rating__star-stroke" points="0,15 4.41,6.07 14.27,4.64 7.13,-2.32 8.82,-12.14 0,-7.5 -8.82,-12.14 -7.13,-2.32 -14.27,4.64 -4.41,6.07" fill="none" />
                                            <polygon className="rating__star-fill" points="0,15 4.41,6.07 14.27,4.64 7.13,-2.32 8.82,-12.14 0,-7.5 -8.82,-12.14 -7.13,-2.32 -14.27,4.64 -4.41,6.07" fill="#000" />
                                        </g>
                                        <g transform="translate(16,16)" strokeDasharray="12 12" strokeDashoffset="12">
                                            <polyline className="rating__star-line" transform="rotate(0)" points="0 4,0 16" />
                                            <polyline className="rating__star-line" transform="rotate(72)" points="0 4,0 16" />
                                            <polyline className="rating__star-line" transform="rotate(144)" points="0 4,0 16" />
                                            <polyline className="rating__star-line" transform="rotate(216)" points="0 4,0 16" />
                                            <polyline className="rating__star-line" transform="rotate(288)" points="0 4,0 16" />
                                        </g>
                                    </g>
                                </svg>
                                <span className="rating__sr">{star} star{star > 1 ? 's' : ''}</span>
                            </label>
                        ))}

                        {/* Display Texts */}
                        <p className="rating__display" data-rating="1" hidden>Terrible</p>
                        <p className="rating__display" data-rating="2" hidden>No me gustó</p>
                        <p className="rating__display" data-rating="3" hidden>Estuvo bien</p>
                        <p className="rating__display" data-rating="4" hidden>¡Muy bueno!</p>
                        <p className="rating__display" data-rating="5" hidden>¡Excelente!</p>
                    </div>
                </form>
            </div>
        </>
    );
};

export default StarRatingInput;
