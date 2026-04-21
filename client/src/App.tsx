import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout.js';
import { AdminPage } from './pages/AdminPage.js';
import { AuthCallbackPage } from './pages/AuthCallbackPage.js';
import { CategoryPage } from './pages/CategoryPage.js';
import { HomePage } from './pages/HomePage.js';
import { Profile } from './pages/Profile.js';
import { ServerDetail } from './pages/ServerDetail.js';
import { SubmitPage } from './pages/SubmitPage.js';

export default function App() {
  return (
    <Routes>
      <Route element={<AuthCallbackPage />} path="/auth/callback" />
      <Route element={<Layout />}>
        <Route element={<HomePage />} path="/" />
        <Route element={<ServerDetail />} path="/servers/:slug" />
        <Route element={<SubmitPage />} path="/submit" />
        <Route element={<Profile />} path="/profile" />
        <Route element={<CategoryPage />} path="/category/:slug" />
        <Route element={<AdminPage />} path="/admin" />
      </Route>
    </Routes>
  );
}
