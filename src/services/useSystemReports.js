import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAdminSession } from '../auth/useAdminSession';
import { createSystemReports } from './systemReportsApi';

export function useSystemReports() {
  const { requestAdmin } = useAdminSession();
  const model = useMemo(() => createSystemReports(requestAdmin), [requestAdmin]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useEffect(() => { model.load(); return () => model.dispose(); }, [model]);
  return { ...state, model };
}
