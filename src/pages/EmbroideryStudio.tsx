import React, { lazy, Suspense, useEffect, useState } from 'react';
import { PageTitle } from '../components/PageTitle';
import { PageSkeleton } from '../components/PageSkeleton';

const Create = lazy(() => import('./Create').then((m) => ({ default: m.Create })));
const Story = lazy(() => import('./Story').then((m) => ({ default: m.Story })));

interface EmbroideryStudioProps {
  param: string;
}

export const EmbroideryStudio: React.FC<EmbroideryStudioProps> = ({ param }) => {
  const isStory = param === 'text';
  const [visitedStory, setVisitedStory] = useState(isStory);
  const [visitedPhoto, setVisitedPhoto] = useState(!isStory);
  const [photoId, setPhotoId] = useState(isStory ? '' : param);

  useEffect(() => {
    if (isStory) setVisitedStory(true);
    else {
      setVisitedPhoto(true);
      setPhotoId(param);
    }
  }, [isStory, param]);

  return (
    <div className="embroidery-studio">
      <PageTitle title="译绣 · 把灵感绣出来" sub="一张照片，一段故事，都可以成为你的绣稿。选择一种方式开始。" />
      <nav className="studio-modes" aria-label="译绣功能">
        <a href="#create" aria-current={!isStory ? 'page' : undefined}>
          <strong>照片转化</strong>
          <span>从图片提取线色，生成绣稿与针路</span>
        </a>
        <a href="#create/text" aria-current={isStory ? 'page' : undefined}>
          <strong>故事译绣</strong>
          <span>从文字选择纹样，继续制作绣稿</span>
        </a>
      </nav>
      {/* Keep visited tools mounted so switching modes retains unfinished work. */}
      <section hidden={isStory} aria-label="照片转化工作区">
        <Suspense fallback={<PageSkeleton />}>
          {(visitedPhoto || !isStory) && <Create id={isStory ? photoId : param} active={!isStory} />}
        </Suspense>
      </section>
      <section hidden={!isStory} aria-label="故事译绣工作区">
        <Suspense fallback={<PageSkeleton />}>
          {(visitedStory || isStory) && <Story />}
        </Suspense>
      </section>
    </div>
  );
};
