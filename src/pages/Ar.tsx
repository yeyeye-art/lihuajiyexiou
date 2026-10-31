import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { PageTitle } from '../components/PageTitle';
import type { PracticeLesson } from '../types';

interface ArProps {
  id?: string;
}

export const Ar: React.FC<ArProps> = ({ id = '' }) => {
  const { progress, addProgressDay, showToast } = useApp();
  const [cameraConsent, setCameraConsent] = useState(false);
  const [lessons, setLessons] = useState<PracticeLesson[]>([]);
  const [customStory, setCustomStory] = useState<any>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const learningRef = useRef<HTMLElement>(null);
  const labRef = useRef<HTMLElement>(null);
  const toolsRef = useRef<HTMLElement>(null);
  const videosRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    if (id === 'story') {
      import('../assets-proxy/story-session.js').then(({ getStorySession }) => {
        if (!active) return;
        const session = getStorySession();
        setCustomStory(session?.selected || null);
      });
    }

    import('../assets-proxy/knowledge-store.js').then(({ lessons: lessonData }) => {
      if (active) setLessons(lessonData);
    });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    let disposeFns: Array<() => void> = [];

    const setupModules = async () => {
      const [learningModule, labModule, videoModule, toolsModule] = await Promise.all([
        import('../assets-proxy/learning-path.js'),
        import('../assets-proxy/stitch-lab.js'),
        import('../assets-proxy/stitch-video-store.js'),
        import('../assets-proxy/digital-tools-store.js'),
      ]);

      if (!active) return;

      const learningPathId = id === 'learn-gun' ? 'gun' : 'tao';
      let labController: any;
      let digitalController: any;
      let videoController: any;

      if (learningRef.current) {
        const learningController = learningModule.mountLearningPath(learningRef.current, {
          initialPath: learningPathId,
          onOpenCourse: ({ target }: any) => {
            videosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return videoController?.selectCourseModule(target) ?? false;
          },
          onOpenKnowledge: ({ target }: any) => {
            window.location.hash = `#guide/${encodeURIComponent(target)}`;
            return true;
          },
          onOpenPractice: async ({ target }: any) => {
            labRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return (await labController?.selectDemo(target)) ?? false;
          },
          onOpenArt: () => {
            const frame = iframeRef.current;
            frame?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            frame?.classList.add('learning-target-highlight');
            setTimeout(() => frame?.classList.remove('learning-target-highlight'), 1800);
            return true;
          },
          onOpenTool: async () => {
            toolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return (await digitalController?.focusOpenButton()) ?? false;
          },
        });
        disposeFns.push(() => learningController.dispose());

        if (labRef.current) {
          labController = labModule.mountStitchLab(labRef.current, {
            onDemoProgress: (detail: any) => learningController.recordDemoProgress(detail),
          });
          disposeFns.push(() => labController?.());
        }
      }

      if (toolsRef.current) {
        digitalController = toolsModule.mountDigitalTools(toolsRef.current);
        disposeFns.push(() => digitalController?.());
      }

      if (videosRef.current) {
        videoController = videoModule.mountVideoArchive(videosRef.current, {
          openCourse: id === 'mooc-suxiu',
        });
        disposeFns.push(() => videoController?.());
      }
    };

    setupModules();

    return () => {
      active = false;
      disposeFns.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error(e);
        }
      });
    };
  }, [id]);

  // Handle iframe message events (MindAR consent & custom generated pattern)
  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;

    let customSent = false;

    const sendConsent = () => {
      frame.contentWindow?.postMessage(
        { scope: 'lihua-ar-host', type: 'consent', value: cameraConsent },
        window.location.origin
      );
    };

    const sendCustom = async () => {
      if (!customStory || customSent) return;
      customSent = true;
      try {
        const { createARLayersFromSVG } = await import('../../assets/ar/svg-layers.js');
        const generated = await createARLayersFromSVG(customStory.svg);
        frame.contentWindow?.postMessage(
          {
            scope: 'lihua-ar-host',
            type: 'generated-pattern',
            pattern: { ...generated, name: customStory.title.slice(0, 70) },
          },
          window.location.origin
        );
      } catch (err: any) {
        showToast('作品分层未完成：' + err.message);
      }
    };

    const receive = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.contentWindow) return;
      if (e.data?.scope !== 'lihua-ar') return;

      if (e.data.type === 'ready') {
        sendConsent();
        sendCustom();
      }
      if (e.data.type === 'resize' && Number.isFinite(e.data.height)) {
        frame.style.height = `${Math.min(2200, Math.max(500, Math.ceil(e.data.height) + 2))}px`;
      }
    };

    window.addEventListener('message', receive);
    sendConsent();

    return () => {
      window.removeEventListener('message', receive);
      frame.contentWindow?.postMessage(
        { scope: 'lihua-ar-host', type: 'stop' },
        window.location.origin
      );
    };
  }, [cameraConsent, customStory, showToast]);

  const handleRecordPractice = (idx: number) => {
    const date = new Date().toLocaleDateString('sv-SE');
    addProgressDay(date);
    showToast('今日练习已记在此浏览器');
  };

  if (id === 'story' && !customStory) {
    return (
      <>
        <PageTitle title="先选一套故事纹样" />
        <a className="btn primary" href="#create/text">
          返回故事译绣
        </a>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={customStory ? 'AR 绣境 · 我的故事纹样' : 'AR 绣境 · 看一枝梨花展开'}
        sub="赏纹、解绣、看针。先欣赏立体构图，也可扫描识别卡，让纹样跟着卡片移动。"
      />

      <label className="check">
        <input
          id="camera-consent"
          type="checkbox"
          checked={cameraConsent}
          onChange={(e) => setCameraConsent(e.target.checked)}
        />
        同意本次在设备内使用相机，不上传画面。
      </label>

      <iframe
        id="ar-frame"
        ref={iframeRef}
        className="demo-frame"
        title="AR绣境与针法教学"
        allow="camera; xr-spatial-tracking"
        src="./assets/ar-experience.html?v=layers-20261009"
      />

      <section id="learning-path" ref={learningRef} aria-label="今日学一针" />
      <section id="stitch-lab" ref={labRef} className="card" aria-label="数字针迹实验室" />
      <section id="digital-tools" ref={toolsRef} aria-label="数字刺绣工具" />

      <h2>基础练习</h2>
      <p className="small">项目自编练习，用于入门参考。</p>
      <div className="grid">
        {lessons.map((l, i) => (
          <article className="card" key={i}>
            <h2>{l.name}</h2>
            <p>{l.summary}</p>
            <ol>
              {l.steps.map((x, stepIdx) => (
                <li key={stepIdx}>{x}</li>
              ))}
            </ol>
            <p>{l.tip}</p>
            <button data-learn={i} onClick={() => handleRecordPractice(i)}>
              记录今日练习
            </button>
          </article>
        ))}
      </div>

      <section id="official-videos" ref={videosRef} aria-label="官方课程与苏绣影像" />
    </>
  );
};
