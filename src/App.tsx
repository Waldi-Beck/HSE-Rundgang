import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { BottomNav, BrandHeader, ToastProvider } from './components/ui';
import { SettingsProvider } from './components/SettingsContext';
import { BackupPage } from './pages/BackupPage';
import { DashboardPage } from './pages/DashboardPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { WalkPage } from './pages/WalkPage';

export function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <SettingsProvider>
          <div className="min-h-[100dvh] pb-24">
            <BrandHeader />
            <main className="mx-auto max-w-6xl px-4 py-5">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/rundgang/:id/:tab?" element={<WalkPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/einstellungen" element={<SettingsPage />} />
                <Route path="/sicherung" element={<BackupPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <BottomNav />
          </div>
        </SettingsProvider>
      </ToastProvider>
    </HashRouter>
  );
}
