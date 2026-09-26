import { lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AdminSessionProvider from './auth/AdminSessionProvider';
import PageErrorBoundary from './components/ui/PageErrorBoundary';
import { PageSkeleton } from './components/ui/PageState';
const AppRoutes = lazy(() => import('./AppRoutes'));
export default function App() {
  return <BrowserRouter><AdminSessionProvider><PageErrorBoundary>
    <Suspense fallback={<PageSkeleton />}><AppRoutes /></Suspense>
  </PageErrorBoundary></AdminSessionProvider></BrowserRouter>;
}
