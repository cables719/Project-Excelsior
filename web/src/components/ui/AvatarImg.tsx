
import React, { useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AvatarImg = ({ src, fallbackIcon: Icon, ringColor, scaleClass }: { src: string, fallbackIcon: any, ringColor?: string, scaleClass?: string }) => {
    const [imgError, setImgError] = useState(false);
    return (
        <div className={`w-20 h-20 flex-shrink-0 rounded-full bg-black flex items-center justify-center shadow-lg overflow-hidden ring-2 ${ringColor || 'ring-zinc-800'}`}>
            {!imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="avatar" className={`w-full h-full object-cover ${scaleClass || ''}`} onError={() => setImgError(true)} />
            ) : (
                <Icon size={20} className="text-zinc-500" />
            )}
        </div>
    );
};
