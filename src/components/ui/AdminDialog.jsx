import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function AdminDialog({ title, onClose, children, dismissOnBackdrop = false, closeDisabled = false }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      previousFocus?.focus();
    };
  }, []);

  return (
    <dialog ref={dialogRef} aria-modal="true" aria-labelledby={titleId} onCancel={(event) => {
      event.preventDefault();
      if (!closeDisabled) onClose();
    }} onClick={dismissOnBackdrop ? (event) => {
      if (closeDisabled || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    } : undefined} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 text-gray-800 shadow-xl backdrop:bg-black/40">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-xl font-bold">{title}</h2>
        <button type="button" disabled={closeDisabled} onClick={onClose} aria-label="Close dialog" className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl p-2 text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"><X size={20} aria-hidden="true" /></button>
      </div>
      {children}
    </dialog>
  );
}
