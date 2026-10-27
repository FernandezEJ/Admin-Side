import { useCallback, useEffect, useRef, useState } from 'react';
import AdminDialog from '../ui/AdminDialog';
import { EducationalArticleDetailView } from '../../pages/EducationalArticleDetail';
import { EducationalArticleFormView } from '../../pages/EducationalArticleForm';
import { useEducationalArticles } from '../../services/useEducationalArticles';
import { protectEducationalPopup } from '../../services/educationalPopupHistory';
import '../../styles/educational-article-popup.css';

export default function EducationalArticlePopup({ id, onDismiss, onChanged }) {
  return <EducationalArticlePopupView remote={useEducationalArticles(id)} onDismiss={onDismiss} onChanged={onChanged} />;
}

export function EducationalArticlePopupView({ remote, onDismiss, onChanged }) {
  const [editing, setEditing] = useState(false), [title, setTitle] = useState('Article Details');
  const closeRequestRef = useRef(null), dirty = useRef(false), history = useRef(null);
  const { model, busy } = remote;
  const close = useCallback(() => history.current?.close(), []);
  const requestClose = useCallback(() => closeRequestRef.current ? closeRequestRef.current() : close(), [close]);
  const protection = useCallback(value => { dirty.current = value; }, []);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    history.current = protectEducationalPopup(window, {
      getProtection: () => ({ dirty: dirty.current, busy: model.getSnapshot().busy }),
      requestClose, dismiss: onDismiss,
    });
    return () => {
      history.current.dispose();
      document.body.style.overflow = overflow;
    };
  }, [model, requestClose, onDismiss]);
  const changed = () => { onChanged();close(); };
  return <div className={`educational-article-popup${editing ? ' is-editing' : ''}`}>
    <AdminDialog title={title} onClose={requestClose} dismissOnBackdrop closeDisabled={busy}>
      {editing ? <EducationalArticleFormView remote={remote} popup onClose={close} onSaved={changed}
        closeRequestRef={closeRequestRef} onTitleChange={setTitle} onDirtyChange={protection} /> :
        <EducationalArticleDetailView remote={remote} popup onClose={close} onChanged={changed}
          onEdit={() => { setTitle('Edit Article');setEditing(true); }} closeRequestRef={closeRequestRef} onTitleChange={setTitle} />}
    </AdminDialog>
  </div>;
}
