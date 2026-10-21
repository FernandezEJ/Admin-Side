import { lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AdminSessionProvider from './auth/AdminSessionProvider';
import PageErrorBoundary from './components/ui/PageErrorBoundary';
import { PageSkeleton } from './components/ui/PageState';
import SidebarProvider from './components/layout/SidebarProvider';
const AppRoutes = lazy(() => import('./AppRoutes'));
export default function App() {
  return <BrowserRouter><AdminSessionProvider><PageErrorBoundary>
    <SidebarProvider><Suspense fallback={<PageSkeleton />}><AppRoutes /></Suspense></SidebarProvider>
  </PageErrorBoundary></AdminSessionProvider></BrowserRouter>;
}
