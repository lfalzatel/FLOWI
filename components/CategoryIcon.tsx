import { SiNetflix, SiYoutube, SiYoutubemusic } from 'react-icons/si';
import { FcGoogle } from 'react-icons/fc';

export function CategoryIcon({ icon, label, className }: { icon: string, label: string, className?: string }) {
  const check = (str: string) => label?.toLowerCase() === str || icon === str;
  if (check('netflix')) return <SiNetflix color="#E50914" className={className || "w-5 h-5"} />;
  if (check('google')) return <FcGoogle className={className || "w-5 h-5"} />;
  if (check('youtube')) return <SiYoutube color="#FF0000" className={className || "w-5 h-5"} />;
  if (check('yt music') || check('ytmusic')) return <SiYoutubemusic color="#FF0000" className={className || "w-5 h-5"} />;
  return <span className={className}>{icon}</span>;
}
