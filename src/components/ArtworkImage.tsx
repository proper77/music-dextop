import { Disc3 } from 'lucide-react';
import { useState } from 'react';

interface ArtworkImageProps {
  src?: string;
  alt: string;
  className?: string;
  radiusPx?: number;
}

export function ArtworkImage({
  src,
  alt,
  className = '',
  radiusPx,
}: ArtworkImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-400 border border-white/10 ${className}`}
        style={radiusPx !== undefined ? { borderRadius: `${radiusPx}px` } : undefined}
        aria-label={alt}
      >
        <Disc3 className="w-1/3 h-1/3 opacity-70" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover bg-slate-900 ${className}`}
      style={radiusPx !== undefined ? { borderRadius: `${radiusPx}px` } : undefined}
    />
  );
}
