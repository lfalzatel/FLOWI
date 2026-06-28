import { SiNetflix, SiYoutube, SiYoutubemusic, SiSpotify, SiGoogledrive, SiGmail, SiGooglephotos } from 'react-icons/si';
import { FcGoogle } from 'react-icons/fc';

export function CategoryIcon({ icon, label, className }: { icon: string, label: string, className?: string }) {
  const check = (str: string) => label?.toLowerCase() === str || icon === str;
  if (check('netflix')) return <SiNetflix color="#E50914" className={className || "w-5 h-5"} />;
  if (check('google')) return <FcGoogle className={className || "w-5 h-5"} />;
  if (check('youtube')) return <SiYoutube color="#FF0000" className={className || "w-5 h-5"} />;
  if (check('yt music') || check('ytmusic')) return <SiYoutubemusic color="#FF0000" className={className || "w-5 h-5"} />;
  if (check('spotify')) return <SiSpotify color="#1DB954" className={className || "w-5 h-5"} />;
  if (check('drive')) return <SiGoogledrive color="#00A4E4" className={className || "w-5 h-5"} />;
  if (check('gmail')) return <SiGmail color="#EA4335" className={className || "w-5 h-5"} />;
  if (check('photos')) return <SiGooglephotos color="#4285F4" className={className || "w-5 h-5"} />;
  
  // Logos estilizados personalizados para marcas locales
  if (check('exito')) {
    return (
      <div className={`${className || "w-5 h-5"} bg-[#FFE800] text-black font-extrabold flex items-center justify-center text-[8px] rounded font-sans tracking-tighter`} style={{ border: '1px solid #E2D300' }}>
        éxito
      </div>
    );
  }
  if (check('d1')) {
    return (
      <div className={`${className || "w-5 h-5"} bg-[#E30613] text-white font-black flex items-center justify-center text-[10px] rounded font-mono`} style={{ border: '1.5px solid #fff' }}>
        D1
      </div>
    );
  }
  if (check('bancolombia')) {
    return (
      <div className={`${className || "w-5 h-5"} bg-black rounded flex flex-col items-center justify-center overflow-hidden`} style={{ border: '1px solid #333' }}>
        {/* Franja de colores amarillo, azul y rojo de Bancolombia */}
        <div className="w-full flex h-[3px]">
          <div className="flex-1 bg-[#FDDA24]"></div>
          <div className="flex-1 bg-[#002F6C]"></div>
          <div className="flex-1 bg-[#E31B23]"></div>
        </div>
        <div className="text-[6.5px] font-sans font-black text-white tracking-tighter leading-none py-0.5">
          co
        </div>
      </div>
    );
  }
  if (check('bbva')) {
    return (
      <div className={`${className || "w-5 h-5"} bg-[#002F6C] text-white font-black flex items-center justify-center text-[8px] rounded font-sans italic tracking-tighter`} style={{ border: '1px solid #00448F' }}>
        BBVA
      </div>
    );
  }
  if (check('claro_hogar') || check('claro hogar')) {
    return (
      <div className={`${className || "w-5 h-5"} bg-[#E30613] text-white rounded-full flex items-center justify-center relative`} style={{ border: '1px solid #FF4D4D' }}>
        <span className="text-[9px] font-bold">🏠</span>
      </div>
    );
  }
  if (check('claro_movil') || check('claro móvil') || check('claro movil')) {
    return (
      <div className={`${className || "w-5 h-5"} bg-[#E30613] text-white rounded-full flex items-center justify-center relative`} style={{ border: '1px solid #FF4D4D' }}>
        <span className="text-[9px] font-bold">📱</span>
      </div>
    );
  }

  return <span className={className}>{icon}</span>;
}
