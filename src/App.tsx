/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider } from './lib/walletContext';
import { LandingPage } from './pages/LandingPage';
import { TerminalPage } from './pages/TerminalPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ProfilePage } from './pages/ProfilePage';
import { DocsPage, LegalPage } from './pages/DocsPage';

export default function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<TerminalPage />} />
          <Route path="/app/discover" element={<DiscoverPage />} />
          <Route path="/app/approvals" element={<ApprovalsPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/terms" element={<LegalPage mode="terms" />} />
          <Route path="/privacy" element={<LegalPage mode="privacy" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}
