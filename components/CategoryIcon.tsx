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

  return <span className={className}>{icon}</span>;
}
