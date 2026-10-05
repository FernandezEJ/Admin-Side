import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAdminSession } from '../auth/useAdminSession';
import { createVerifications } from './verificationsApi';

export function useVerifications(id) {
  const { requestAdmin } = useAdminSession();
  const model = useMemo(() => createVerifications(requestAdmin, id), [requestAdmin, id]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useEffect(() => { model.load(); return () => model.dispose(); }, [model]);
  return { ...state, model };
}
