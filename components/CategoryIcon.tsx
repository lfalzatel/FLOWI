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
          <path d="M20 9L29 17L20 25L11 17L20 9Z" fill="#00FFD1" style={{ mixBlendMode: 'screen' }} opacity="0.8" />
          {/* Rombo magenta/fucsia */}
          <path d="M16 13L25 21L16 29L7 21L16 13Z" fill="#FF007A" style={{ mixBlendMode: 'screen' }} opacity="0.8" />
          {/* Rombo morado */}
          <path d="M24 13L33 21L24 29L15 21L24 13Z" fill="#7000FF" style={{ mixBlendMode: 'screen' }} opacity="0.8" />
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

  // --- NUEVOS LOGOS DE EMPRESAS COLOMBIANAS E ICONOS PREMIUM ---

  if (check('epm')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
        {/* Logo EPM (Hojas verdes curvas estilizadas) */}
        <path d="M14 26C14 20 18 16 23 14C21 17 21 21 23 24C20 23 17 24 14 26Z" fill="#78B833" />
        <path d="M26 26C26 20 22 16 17 14C19 17 19 21 17 24C20 23 23 24 26 26Z" fill="#009639" />
        <circle cx="20" cy="20" r="1.5" fill="#FDDA24" />
        <text x="50%" y="84%" textAnchor="middle" fill="#009639" fontSize="6" fontWeight="bold" fontFamily="sans-serif">epm</text>
      </svg>
    );
  }

  if (check('efigas')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#0A2240" />
        {/* Llama de Efigas (Azul y Naranja) */}
        <path d="M20 8C20 8 13 15 13 22C13 25.8 16.1 29 20 29C23.9 29 27 25.8 27 22C27 15 20 8 20 8Z" fill="#009EE0" />
        <path d="M20 14C20 14 16 18 16 23C16 25.2 17.8 27 20 27C22.2 27 24 25.2 24 23C24 18 20 14 20 14Z" fill="#FF7A00" />
        <text x="50%" y="85%" textAnchor="middle" fill="#FFFFFF" fontSize="5" fontWeight="bold" fontFamily="sans-serif" letterSpacing="0.2">EFIGAS</text>
      </svg>
    );
  }

  if (check('alcanos')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#0054A6" />
        {/* Símbolo Alcanos (Llama y estructuras circulares) */}
        <path d="M20 10C24.4 10 28 13.6 28 18C28 23 20 30 20 30C20 30 12 23 12 18C12 13.6 15.6 10 20 10Z" fill="#FFF100" />
        <path d="M20 14C22.2 14 24 15.8 24 18C24 21 20 25 20 25C20 25 16 21 16 18C16 15.8 17.8 14 20 14Z" fill="#0054A6" />
        <text x="50%" y="85%" textAnchor="middle" fill="#FFFFFF" fontSize="5" fontWeight="bold" fontFamily="sans-serif">ALCANOS</text>
      </svg>
    );
  }

  if (check('parqueadero') || check('parking')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#1E3A8A" />
        {/* Letra P de Parking oficial */}
        <rect x="11" y="10" width="18" height="20" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="2" />
        <path d="M16 26V14H21C22.7 14 24 15.3 24 17C24 18.7 22.7 20 21 20H16" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (check('cine') || check('cinema')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#7F1D1D" />
        {/* Claqueta de cine */}
        <path d="M10 16H30V28H10V16Z" fill="#FFFFFF" />
        <path d="M10 12H30L28 16H8L10 12Z" fill="#000000" />
        <path d="M13 12L15 16M19 12L21 16M25 12L27 16" stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="20" cy="22" r="2" fill="#7F1D1D" />
      </svg>
    );
  }

  if (check('deportes') || check('piscina') || check('sports')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#065F46" />
        {/* Icono de Nadador / Piscina */}
        <path d="M20 12C21.1 12 22 11.1 22 10C22 8.9 21.1 8 20 8C18.9 8 18 8.9 18 10C18 11.1 18.9 12 20 12Z" fill="#FFFFFF" />
        <path d="M13 22C15.5 22 17 20.5 19 20.5C21 20.5 22.5 22 25 22M10 25C13.5 25 15.5 23 18 23C20.5 23 22.5 25 26 25" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
        <path d="M15 18C17.5 16 19.5 16.5 21 15C22.5 13.5 24.5 14 26 15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // --- NUEVOS LOGOS CC SAN NICOLÁS / GRANDES SUPERFICIES ---

  if (check('play store') || check('playstore')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
        {/* Triángulo de Google Play */}
        <path d="M10 8V32L26 20L10 8Z" fill="#00E5A0" />
        <path d="M10 8V20L26 20L10 8Z" fill="#00C3FF" opacity="0.8" />
        <path d="M10 32V20L26 20L10 32Z" fill="#FF3366" opacity="0.8" />
        <path d="M26 20L19 15L10 20L19 25L26 20Z" fill="#FFBB00" opacity="0.9" />
      </svg>
    );
  }

  if (check('olimpica')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#E30613" />
        <circle cx="20" cy="18" r="8" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
        <path d="M20 13V23" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <text x="50%" y="84%" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">OLIMPICA</text>
      </svg>
    );
  }

  if (check('jumbo')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#00A859" />
        {/* Elefante de Jumbo simplificado */}
        <path d="M14 24C14 20 16 16 20 16C23 16 25 18 25 21C25 24 23 25 20 25C18 25 16 26 14 27" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="23" cy="19" r="1" fill="#FFFFFF" />
        <text x="50%" y="84%" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" fontFamily="sans-serif">JUMBO</text>
      </svg>
    );
  }

  if (check('carulla')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#005A36" />
        {/* Rombo elegante Carulla */}
        <path d="M20 10L28 18L20 26L12 18L20 10Z" stroke="#FFFFFF" strokeWidth="1.8" fill="none" />
        <text x="50%" y="84%" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="bold" fontFamily="serif" style={{ fontStyle: 'italic' }}>Carulla</text>
      </svg>
    );
  }

  if (check('homecenter')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#004B87" />
        {/* Techo de Homecenter */}
        <path d="M10 22V15L20 9L30 15V22H10Z" fill="#E30613" />
        <path d="M13 22V17L20 12L27 17V22H13Z" fill="#FFFFFF" />
        <rect x="17" y="18" width="6" height="4" fill="#004B87" />
      </svg>
    );
  }

  if (check('ktronix')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#002D72" />
        <text x="50%" y="48%" textAnchor="middle" fill="#FF6A00" fontSize="9" fontWeight="black" fontFamily="sans-serif">K</text>
        <text x="50%" y="80%" textAnchor="middle" fill="#FFFFFF" fontSize="5" fontWeight="bold" fontFamily="sans-serif" letterSpacing="0.5">KTRONIX</text>
      </svg>
    );
  }

  if (check('panamericana')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#0A2240" />
        {/* P de Panamericana */}
        <path d="M15 11H23C26 11 27.5 12.5 27.5 14.5C27.5 16.5 26 18 23 18H18V28H15V11ZM18 15.5H22.5C23.8 15.5 24.5 15.1 24.5 14.5C24.5 13.9 23.8 13.5 22.5 13.5H18V15.5Z" fill="#00A4E4" />
        <text x="50%" y="85%" textAnchor="middle" fill="#FFFFFF" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif">PANAMERICANA</text>
      </svg>
    );
  }

  if (check('frisby')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#E30613" />
        {/* Pollito Frisby simplificado */}
        <circle cx="20" cy="16" r="5" fill="#FDDA24" />
        <path d="M18 15C18 15 19 14 20 15M22 15C22 15 21 14 20 15" stroke="#000000" strokeWidth="0.8" />
        <path d="M19.5 17.5L20 18.5L20.5 17.5H19.5Z" fill="#FF7A00" />
        <text x="50%" y="84%" textAnchor="middle" fill="#FDDA24" fontSize="6.5" fontWeight="black" fontFamily="sans-serif" italic="true">Frisby</text>
      </svg>
    );
  }

  if (check('popsy')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#E10074" />
        {/* Helado de Popsy */}
        <path d="M15 26L20 32L25 26H15Z" fill="#FBBF24" />
        <circle cx="18" cy="22" r="3.5" fill="#FFFFFF" />
        <circle cx="22" cy="22" r="3.5" fill="#FF7A00" />
        <circle cx="20" cy="19" r="3" fill="#EC4899" />
        <text x="50%" y="85%" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">POPSY</text>
      </svg>
    );
  }

  if (check('daviplata')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#E30613" />
        {/* Casita de Daviplata */}
        <path d="M12 25V18L20 12L28 18V25H12Z" fill="#FFFFFF" />
        <rect x="15" y="21" width="3" height="4" fill="#E30613" />
        <path d="M22 17.5V23.5H25V17.5H22Z" fill="#FDDA24" />
        <text x="50%" y="84%" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">daviplata</text>
      </svg>
    );
  }

  if (check('davivienda')) {
    return (
      <svg className={className || "w-5 h-5"} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
        {/* Casita roja de Davivienda */}
        <path d="M12 25V17L20 11L28 17V25H12Z" fill="#E30613" />
        <rect x="18" y="20" width="4" height="5" fill="#FFFFFF" />
        <text x="50%" y="84%" textAnchor="middle" fill="#E30613" fontSize="5" fontWeight="bold" fontFamily="sans-serif">DAVIVIENDA</text>
      </svg>
    );
  }

  return <span className={className}>{icon}</span>;
}
