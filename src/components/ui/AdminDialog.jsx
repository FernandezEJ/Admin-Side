import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function AdminDialog({ title, onClose, children }) {
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
    <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => {
      event.preventDefault();
      onClose();
    }} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 text-gray-800 shadow-xl backdrop:bg-black/40">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-xl font-bold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
      </div>
      {children}
    </dialog>
  );
}
