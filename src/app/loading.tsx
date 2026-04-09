export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
      {/* Sutil pulso del logo */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 bg-[#00A9CE] rounded-full opacity-20 animate-ping"></div>
        <div className="relative z-10 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100">
          <span className="text-[#00A9CE] font-bold text-xs tracking-tighter">HOME</span>
        </div>
      </div>
      <p className="text-slate-400 text-sm tracking-widest uppercase animate-pulse">Cargando...</p>
    </div>
  )
}
