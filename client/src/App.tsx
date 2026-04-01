import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout.js';
import { CategoryPage } from './pages/CategoryPage.js';
import { HomePage } from './pages/HomePage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { ServerDetail } from './pages/ServerDetail.js';
import { SubmitPage } from './pages/SubmitPage.js';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route element={<HomePage />} path="/" />
        <Route element={<ServerDetail />} path="/servers/:slug" />
        <Route element={<SubmitPage />} path="/submit" />
        <Route element={<ProfilePage />} path="/profile" />
        <Route element={<CategoryPage />} path="/category/:slug" />
      </Route>
    </Routes>
  );
}
