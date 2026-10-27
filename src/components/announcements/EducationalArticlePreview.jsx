import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import AnnouncementBody from './AnnouncementBody';

export function ArticleCover({ src, title, full = false }) {
  const [failed, setFailed] = useState(null);
  return src && src !== failed ? <img src={src} alt={title || 'Article cover'} onError={() => setFailed(src)} className={full ? 'max-h-96 w-full rounded-xl object-contain' : 'aspect-video w-full object-cover'} /> : <div className="flex aspect-video items-center justify-center rounded-xl bg-primary-soft"><ImageOff size={28} className="text-primary" aria-label="No cover image" /></div>;
}

export default function EducationalArticlePreview({ article, categories = {} }) {
  return <article className="space-y-4">
    <ArticleCover src={article.image_url} title={article.title} full />
    <p className="text-xs font-semibold text-primary">{categories[article.category] || article.category_label || 'Uncategorized'}</p>
    <h2 className="break-words text-2xl font-bold text-gray-800">{article.title || 'Untitled draft'}</h2>
    <p className="break-words text-gray-500">{article.short_description}</p>
    <AnnouncementBody announcement={article} />
    <p className="border-t border-gray-100 pt-4 text-xs leading-5 text-gray-500">Educational information only. Final donation eligibility is determined by the donation facility.</p>
  </article>;
}
