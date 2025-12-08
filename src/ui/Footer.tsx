import React from 'react';

interface FooterProps {
  onEasterEggClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ onEasterEggClick }) => {
  return (
    <footer className="bg-white py-8">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 gap-6 md:gap-0">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <span className="font-bold text-slate-700 text-lg">HOME</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-900">Sobre Nosotros</a>
            <a href="#" className="hover:text-slate-900">Privacidad</a>
            <a href="#" className="hover:text-slate-900">Términos</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span>© 2025 HOME Experience.</span>
          <button
            onClick={onEasterEggClick}
            className="text-slate-300 hover:text-slate-500 transition-colors"
            data-interactive="true"
          >
            ⌂
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;