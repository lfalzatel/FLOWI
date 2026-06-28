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
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#000000" />
        {/* Barras de Bancolombia */}
        <path d="M10 24L18 13H24L16 24H10Z" fill="#FDDA24" />
        <path d="M17 24L25 13H31L23 24H17Z" fill="#002F6C" />
        <path d="M24 24L32 13H38L30 24H24Z" fill="#E31B23" stroke="#000000" strokeWidth="1" />
        <text x="50%" y="82%" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="sans-serif" letterSpacing="-0.5">Bancolombia</text>
      </svg>
    );
  }
  if (check('nequi')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#0E001D" />
        {/* Elemento Geométrico Nequi */}
        <g opacity="0.95">
          {/* Rombo cian */}
          <path d="M20 9L29 17L20 25L11 17L20 9Z" fill="#00FFD1" mixBlendMode="screen" opacity="0.8" />
          {/* Rombo magenta/fucsia */}
          <path d="M16 13L25 21L16 29L7 21L16 13Z" fill="#FF007A" mixBlendMode="screen" opacity="0.8" />
          {/* Rombo morado */}
          <path d="M24 13L33 21L24 29L15 21L24 13Z" fill="#7000FF" mixBlendMode="screen" opacity="0.8" />
        </g>
        <text x="50%" y="84%" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="black" fontFamily="sans-serif" letterSpacing="0.5">NEQUI</text>
      </svg>
    );
  }
  if (check('bbva')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#072146" />
        {/* Tipografía Oficial BBVA */}
        <g fill="#FFFFFF">
          {/* B */}
          <path d="M9 14.5H12.5C14.2 14.5 15.2 15.3 15.2 16.6C15.2 17.5 14.5 18.2 13.5 18.4C14.8 18.6 15.6 19.4 15.6 20.8C15.6 22.2 14.3 23.2 12.5 23.2H9V14.5ZM11.4 17.8H12.3C13 17.8 13.4 17.5 13.4 16.9C13.4 16.3 13 16 12.3 16H11.4V17.8ZM11.4 21.7H12.4C13.2 21.7 13.7 21.3 13.7 20.7C13.7 20.1 13.2 19.7 12.4 19.7H11.4V21.7Z" />
          {/* B */}
          <path d="M16.5 14.5H20C21.7 14.5 22.7 15.3 22.7 16.6C22.7 17.5 22 18.2 21 18.4C22.3 18.6 23.1 19.4 23.1 20.8C23.1 22.2 21.8 23.2 20 23.2H16.5V14.5ZM18.9 17.8H19.8C20.5 17.8 20.9 17.5 20.9 16.9C20.9 16.3 20.5 16 19.8 16H18.9V17.8ZM18.9 21.7H19.9C20.7 21.7 21.2 21.3 21.2 20.7C21.2 20.1 20.7 19.7 19.9 19.7H18.9V21.7Z" />
          {/* V */}
          <path d="M23.9 14.5H26.3L28.1 20.8L29.9 14.5H32.3L29.3 23.2H26.9L23.9 14.5Z" />
          {/* A */}
          <path d="M34.8 14.5H37.3L39 23.2H36.6L36.2 21.2H34.4L34 23.2H31.7L34.8 14.5ZM34.7 19.4H35.9L35.3 16.3L34.7 19.4Z" />
        </g>
      </svg>
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
