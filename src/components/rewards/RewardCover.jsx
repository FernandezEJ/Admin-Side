import { useState } from 'react';
import { Gift } from 'lucide-react';

export default function RewardCover({ src, name, full = false }) {
  const [failed, setFailed] = useState(null);
  return <div className={`flex items-center justify-center bg-gray-100 ${full ? 'min-h-40 overflow-hidden rounded-xl' : 'h-44'}`}>
    {src && failed !== src ? <img src={src} alt={name || 'Reward image'} onError={() => setFailed(src)} className={full ? 'max-h-72 w-full object-contain' : 'h-full w-full object-cover'} /> :
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl lf-icon-brand"><Gift size={28} aria-label="No reward image" /></div>}
  </div>;
}
