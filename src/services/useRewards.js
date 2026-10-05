import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAdminSession } from '../auth/useAdminSession';
import { createRewards } from './rewardsApi';

export function useRewards(id) {
  const { requestAdmin } = useAdminSession();
  const model = useMemo(() => createRewards(requestAdmin, id), [requestAdmin, id]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useEffect(() => { model.load(); return () => model.dispose(); }, [model]);
  return { ...state, model };
}
