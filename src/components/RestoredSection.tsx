import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { UserProgress } from '../types';
import {hasConversation} from '../features/xiaoli/session';

type SectionName = 'palette' | 'guide' | 'game' | 'account';
interface RestoreOptions {
  page: SectionName;
  query: string;
  isCurrent: () => boolean;
  onProgress: (progress: UserProgress) => void;
  onToast: (message: string) => void;
}
interface RestoredModule {
  mountRestoredSection: (root: HTMLElement, options: RestoreOptions) => Promise<() => void>;
  cloudReady: () => Promise<unknown>;
}
let modulePromise: Promise<RestoredModule> | undefined;
export function loadRestoredSections(): Promise<RestoredModule> {
  const url = new URL(`${import.meta.env.BASE_URL}assets/restored-sections.js`, location.origin).href;
  return modulePromise ??= import(/* @vite-ignore */ url) as Promise<RestoredModule>;
}

export const RestoredSection: React.FC<{ page: SectionName; query?: string }> = ({ page, query = '' }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const { showToast, updateBestScore, addProgressDay } = useApp();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    setError('');
    root.textContent = '正在载入完整资料…';
    loadRestoredSections().then(async (module) => {
      if (disposed) return;
      const dispose = await module.mountRestoredSection(root, {
        page, query, isCurrent: () => !disposed,
        onToast: showToast,
        onProgress: (progress) => {
          updateBestScore(progress.best);
          progress.days.forEach(addProgressDay);
        },
      });
      if (disposed) dispose();
      else cleanup = dispose;
    }).catch((cause: unknown) => {
      if (!disposed) setError(cause instanceof Error ? cause.message : '资料载入失败，请刷新重试。');
    });
    return () => { disposed = true; cleanup?.(); root.replaceChildren(); };
  }, [page, query, showToast, updateBestScore, addProgressDay]);

  return <>
    {(page==='guide'||page==='palette')&&hasConversation()&&<p className="xiaoli-reading-return"><a href="#xiaoli">← 返回小梨，继续刚才的话题</a></p>}
    {error && <p role="alert">{error}</p>}
    <div ref={rootRef} id={page === 'account' ? 'cloud-account-panel' : undefined}
      className={`restored-section restored-${page}${page === 'account' ? ' card cloud-account-panel' : ''}`} />
  </>;
};
