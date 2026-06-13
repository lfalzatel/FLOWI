import { SiNetflix, SiYoutube, SiYoutubemusic } from 'react-icons/si';
import { FcGoogle } from 'react-icons/fc';

export function CategoryIcon({ icon, label, className }: { icon: string, label: string, className?: string }) {
  if (label === 'Netflix') return <SiNetflix color="#E50914" className={className || "w-5 h-5"} />;
  if (label === 'Google') return <FcGoogle className={className || "w-5 h-5"} />;
  if (label === 'YouTube') return <SiYoutube color="#FF0000" className={className || "w-5 h-5"} />;
  if (label === 'YT Music') return <SiYoutubemusic color="#FF0000" className={className || "w-5 h-5"} />;
  return <span className={className}>{icon}</span>;
}
