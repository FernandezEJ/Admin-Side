import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAdminSession } from '../auth/useAdminSession';
import { createEducationalArticles } from './educationalArticlesApi';

export function useEducationalArticles(id, initialStatus = 'published') {
  const { requestAdmin } = useAdminSession();
  const model = useMemo(() => createEducationalArticles(requestAdmin, id, initialStatus), [requestAdmin, id, initialStatus]);
  const state = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  useEffect(() => { void model.load();return () => model.dispose(); }, [model]);
  return { ...state, model };
}
