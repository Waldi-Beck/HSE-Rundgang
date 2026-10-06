import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { BottomNav, BrandHeader, ToastProvider } from './components/ui';
import { BackupPage } from './pages/BackupPage';
import { DashboardPage } from './pages/DashboardPage';
import { RegisterPage } from './pages/RegisterPage';
import { WalkPage } from './pages/WalkPage';

export function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <div className="min-h-[100dvh] pb-24">
          <BrandHeader />
          <main className="mx-auto max-w-3xl px-4 py-5">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/rundgang/:id/:tab?" element={<WalkPage />} />
              <Route path="/maengel" element={<RegisterPage />} />
              <Route path="/sicherung" element={<BackupPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </ToastProvider>
    </HashRouter>
  );
}
