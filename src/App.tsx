import React, { useEffect, Suspense, lazy } from 'react';
import { useHashRoute, pageNames } from './utils/router';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { Modal } from './components/Modal';
import { PageSkeleton } from './components/PageSkeleton';

// Route-level code splitting with lazy loading
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Library = lazy(() => import('./pages/Library').then((m) => ({ default: m.Library })));
const Gallery = lazy(() => import('./pages/Gallery').then((m) => ({ default: m.Gallery })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const EmbroideryStudio = lazy(() => import('./pages/EmbroideryStudio').then((m) => ({ default: m.EmbroideryStudio })));
const Game = lazy(() => import('./pages/Game').then((m) => ({ default: m.Game })));
const Face = lazy(() => import('./pages/Face').then((m) => ({ default: m.Face })));
const Ar = lazy(() => import('./pages/Ar').then((m) => ({ default: m.Ar })));
const Guide = lazy(() => import('./pages/Guide').then((m) => ({ default: m.Guide })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Collaborate = lazy(() => import('./pages/Collaborate').then((m) => ({ default: m.Collaborate })));
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const Palette = lazy(() => import('./pages/Palette').then((m) => ({ default: m.Palette })));
const Search = lazy(() => import('./pages/Search').then((m) => ({ default: m.Search })));
const Exhibit = lazy(() => import('./pages/Exhibit').then((m) => ({ default: m.Exhibit })));

export const App: React.FC = () => {
  const { page, param } = useHashRoute();
  const { isMenuOpen } = useApp();

  useEffect(() => {
    document.body.dataset.page = page;
    document.body.classList.toggle('menu-open', isMenuOpen);
  }, [page, isMenuOpen]);

  useEffect(() => {
    const pageTitle = pageNames[page];
    document.title =
      page === 'home'
        ? '梨花季·译绣 — 绢白馆藏'
        : `${pageTitle || (page === 'product' ? '文创详情' : '页面')} · 梨花季·译绣`;
  }, [page]);

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home />;
      case 'library':
        return <Library initialQuery={param} />;
      case 'gallery':
        return <Gallery initialQuery={param} />;
      case 'product':
        return <ProductDetail id={param} />;
      case 'create':
        return <EmbroideryStudio param={param} />;
      case 'game':
        return <Game />;
      case 'face':
        return <Face param={param} />;
      case 'ar':
        return <Ar id={param} />;
      case 'guide':
        return <Guide initialQuery={param} />;
      case 'profile':
        return <Profile />;
      case 'collaborate':
        return <Collaborate />;
      case 'about':
        return <About />;
      case 'palette':
        return <Palette />;
      case 'search':
        return <Search query={param} />;
      case 'exhibit':
        return <Exhibit />;
      default:
        return <About />;
    }
  };

  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <Sidebar currentPage={page} />
      <div className="workspace">
        <Header currentPage={page} />
        <main id="main" tabIndex={-1}>
          <Suspense fallback={<PageSkeleton />}>{renderPage()}</Suspense>
        </main>
        <Footer />
      </div>
      <BottomNav currentPage={page} />
      <Modal />
    </>
  );
};
