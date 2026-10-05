import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAdminSession } from '../auth/useAdminSession';
import { createAnnouncements } from './announcementsApi';

export function useAnnouncements(id) {
  const { requestAdmin } = useAdminSession();
  const model = useMemo(() => createAnnouncements(requestAdmin, id), [requestAdmin, id]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useEffect(() => { model.load(); return () => model.dispose(); }, [model]);
  return { ...state, model };
}
