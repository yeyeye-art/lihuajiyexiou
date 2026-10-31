import { useState, useEffect, useCallback } from 'react';

export interface RouteState {
  page: string;
  param: string;
  hash: string;
}

export const pageNames: Record<string, string> = {
  home: '首页',
  library: '灵感 · 祥云纹样库',
  create: '译绣',
  ar: '针法与 AR 教学',
  face: '文创试搭',
  gallery: '梨花绣馆',
  game: '祥云配对挑战',
  guide: '苏绣知识',
  palette: '东方色谱',
  profile: '我的学习记录',
  collaborate: '协作修改',
  about: '功能与隐私说明',
  search: '搜索绣品、针法、灵感',
  exhibit: '梨花新绣',
};

export const primaryNav: Array<[string, string, string]> = [
  ['home', '首页', 'home'],
  ['library', '灵感', 'flower'],
  ['create', '译绣', 'needle'],
  ['gallery', '绣馆', 'archive'],
  ['profile', '我的', 'user'],
];

export const routeIcons: Record<string, string> = {
  story: 'needle',
  home: 'home',
  library: 'flower',
  create: 'needle',
  gallery: 'archive',
  profile: 'user',
  ar: 'scan',
  face: 'camera',
  game: 'game',
  guide: 'book',
  palette: 'palette',
  collaborate: 'users',
  about: 'info',
  exhibit: 'flower',
  search: 'search',
};

export function activeSection(page: string): string {
  const map: Record<string, string> = {
    story: 'create',
    product: 'gallery',
    face: 'gallery',
    exhibit: 'gallery',
    palette: 'library',
    search: 'library',
    ar: 'create',
    guide: 'create',
    game: 'library',
    collaborate: 'profile',
    about: 'profile',
  };
  return map[page] || page;
}

export function parseHash(rawHash: string): RouteState {
  const hash = rawHash.replace(/^#/, '');
  const [firstPart, ...rest] = hash.split('/');
  let page = firstPart || 'home';
  let param = rest.join('/');

  // Existing story bookmarks open the story tool inside the shared studio.
  if (page === 'story') {
    page = 'create';
    param = 'text';
  }

  if (page === 'mall') page = 'gallery';
  if (page === 'ai') page = 'create';
  if (page === 'avatar') page = 'guide';
  if (!pageNames[page] && page !== 'product') page = 'about';

  return {
    page,
    param: decodeURIComponent(param || ''),
    hash,
  };
}

export function navigate(targetHash: string) {
  const normalized = targetHash.startsWith('#') ? targetHash : `#${targetHash}`;
  if (window.location.hash === normalized) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = normalized;
  }
}

export function useHashRoute() {
  const [route, setRoute] = useState<RouteState>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = parseHash(window.location.hash);
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if ('startViewTransition' in document && !prefersReducedMotion) {
        (document as any).startViewTransition(() => {
          setRoute(nextRoute);
          window.scrollTo(0, 0);
        });
      } else {
        setRoute(nextRoute);
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}
