import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAdminSession } from '../auth/useAdminSession';
import { createDashboard } from './dashboardApi';

export function useDashboard() {
  const { requestAdmin } = useAdminSession();
  const model = useMemo(() => createDashboard(requestAdmin), [requestAdmin]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useEffect(() => { model.load(); return () => model.dispose(); }, [model]);
  return { ...state, model };
}
