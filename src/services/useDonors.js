import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAdminSession } from '../auth/useAdminSession';
import { createDonors } from './donorsApi';

export function useDonors() {
  const { requestAdmin } = useAdminSession();
  const model = useMemo(() => createDonors(requestAdmin), [requestAdmin]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useEffect(() => { model.load(); return () => model.dispose(); }, [model]);
  return { ...state, model };
}
