import { useState } from 'react';

export const LOGO_SRC = '/brand/sisyphus-logo.png';
const FALLBACK_SRC = '/brand/sisyphus-mark.svg';

/**
 * Official Sisyphus logo. Loads public/brand/sisyphus-logo.png and, if
 * that file is missing, the interim SVG mark so nothing ever breaks.
 * The image is always square and never cropped or stretched.
 */
export function LogoMark({ size = 36, className = '' }) {
  const [src, setSrc] = useState(LOGO_SRC);
  return (
    <img
      src={src}
      onError={() => src !== FALLBACK_SRC && setSrc(FALLBACK_SRC)}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable="false"
      className={`shrink-0 rounded-full object-contain select-none ${className}`}
      style={{ width: size, height: size, aspectRatio: '1 / 1' }}
    />
  );
}

/** Logo mark plus "Sisyphus" wordmark. */
export default function Logo({ size = 36, showWordmark = true, tagline, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="leading-none">
          <span className="block text-[21px] font-bold tracking-[-0.02em] text-espresso">Sisyphus</span>
          {tagline && <span className="mt-1 block text-xs font-medium text-brown">{tagline}</span>}
        </span>
      )}
    </span>
  );
}
