import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAdminSession } from '../auth/useAdminSession';
import { createAuditLogs } from './auditLogsApi';

export function useAuditLogs() {
  const { requestAdmin } = useAdminSession();
  const model = useMemo(() => createAuditLogs(requestAdmin), [requestAdmin]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useEffect(() => { model.load(); return () => model.dispose(); }, [model]);
  return { ...state, model };
}
