import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { downloadFile, resolveAsset } from '../utils/download';

interface CreateProps {
  id?: string;
  active?: boolean;
}

export const Create: React.FC<CreateProps> = ({ id = '', active = true }) => {
  const { patterns, ensurePatternsLoaded } = useApp();
  const [source, setSource] = useState(resolveAsset('assets/ivory/embroidery.webp'));
  const [sourceRecord, setSourceRecord] = useState<any>(null);
  const [title, setTitle] = useState('花间绣稿');
  const [size, setSize] = useState(16);
  const [spacing, setSpacing] = useState(0.6);
  const [colors, setColors] = useState(6);
  const [stitch, setStitch] = useState('直线针');
  const [agreed, setAgreed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [storySession, setStorySession] = useState<any>(null);

  useEffect(() => {
    ensurePatternsLoaded();
  }, [ensurePatternsLoaded]);

  useEffect(() => {
    if (!active) return;
    let current = true;
    if (id === 'story') {
      import('../assets-proxy/story-session.js').then(({ getStorySession }) => {
        if (!current) return;
        const session = getStorySession();
        setStorySession(session);
        if (session?.selected) {
          import('../assets-proxy/engine.js').then(({ dataURL }) => {
            if (current) {
              setSource(dataURL(session.selected.svg));
              setSourceRecord(null);
              setResult(null);
              setTitle('故事数字工艺参考稿');
            }
          });
        }
      });
    } else if (id) {
      ensurePatternsLoaded().then((pList) => {
        if (!current) return;
        const found = pList.find((x) => x.id === id);
        if (found) {
          setStorySession(null);
          setResult(null);
          setSourceRecord(found);
          setSource(resolveAsset(found.image));
          setTitle(found.title);
        }
      });
    }
    return () => {
      current = false;
    };
  }, [id, active, ensurePatternsLoaded]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { readImage } = await import('../assets-proxy/engine.js');
      const dataUri = await readImage(file);
      setSource(dataUri);
      setSourceRecord(null);
      setStorySession(null);
      setResult(null);
      setStatusText('');
    } catch (err: any) {
      setStatusText(err.message || '图片读取失败');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setIsProcessing(true);
    setStatusText('正在分色与计算针路…');

    try {
      const { generate, designSVG, pathCSV } = await import('../assets-proxy/engine.js');
      const opt = {
        title,
        size: Number(size),
        spacing: Number(spacing),
        colors: Number(colors),
        stitch,
        ignoreBg: false,
      };

      const d = await generate(source, opt);

      if (sourceRecord) {
        d.archiveSource = {
          title: sourceRecord.title,
          sourceUrl: sourceRecord.sourceUrl,
          author: sourceRecord.author,
          license: sourceRecord.license,
          licenseUrl: sourceRecord.licenseUrl,
        };
        d.svg = designSVG(d);
      }

      d.csv = pathCSV(d);

      if (storySession?.selected) {
        storySession.finalOutput = {
          type: '数字工艺参考稿',
          options: opt,
          score: d.score,
          metrics: d.metrics,
          svg: d.svg,
          csv: d.csv,
        };
        const { recordAction } = await import('../assets-proxy/story-session.js');
        recordAction('embroidery', { options: opt, score: d.score, stitches: d.paths.length });
      }

      setResult(d);
      setStatusText('已完成，结果仅在当前页面内。');
    } catch (err: any) {
      setStatusText(err.message || '生成失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSVG = () => {
    if (!result?.svg) return;
    downloadFile('梨花季绣稿.svg', result.svg, 'image/svg+xml');
  };

  const handleDownloadCSV = () => {
    if (!result?.csv) return;
    downloadFile('梨花季针路.csv', result.csv, 'text/csv');
  };

  const handleDownloadStorySession = async () => {
    const { exportSession } = await import('../assets-proxy/story-session.js');
    downloadFile(
      'lihuaji-aigc-session.json',
      JSON.stringify(await exportSession(), null, 2),
      'application/json'
    );
  };

  if (id === 'story' && !storySession?.selected) {
    return (
      <>
        <h2>先选一套故事纹样</h2>
        <a className="btn primary" href="#create/text">
          返回故事译绣
        </a>
      </>
    );
  }

  return (
    <>
      <h2>{id === 'story' ? '把故事纹样转成绣稿' : '照片转化 · 把画面绣出来'}</h2>
      <p className="sub">从一张图片出发，试着安排线色与针路。图像在本机处理，工艺评估仅供小样参考。</p>

      <ol className="step-strip">
        <li>
          <b>01</b> 选择图片
        </li>
        <li>
          <b>02</b> 调整线色
        </li>
        <li>
          <b>03</b> 下载绣稿
        </li>
      </ol>

      <div className="split create-layout">
        <div className="card">
          <img id="source-preview" className="image-fit" src={source} alt="当前转稿素材" />
          <label>
            选择自己有权使用的图片
            <input
              id="upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
            />
          </label>
          <p className="small">照片不上传，不保存到公共仓库。刷新页面会清除当前照片。</p>
        </div>

        <form id="create-form" className="card" onSubmit={handleGenerate}>
          <label>
            作品名称
            <input
              name="title"
              value={title}
              maxLength={60}
              required
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            成品边长（厘米）
            <input
              name="size"
              type="number"
              value={size}
              min={5}
              max={50}
              required
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>
          <label>
            参考线距（毫米）
            <input
              name="spacing"
              type="number"
              value={spacing}
              min={0.3}
              max={1.5}
              step={0.1}
              required
              onChange={(e) => setSpacing(Number(e.target.value))}
            />
          </label>
          <label>
            颜色数量
            <select
              name="colors"
              value={colors}
              onChange={(e) => setColors(Number(e.target.value))}
            >
              <option value={4}>4</option>
              <option value={6}>6</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
            </select>
          </label>
          <label>
            针法
            <select
              name="stitch"
              value={stitch}
              onChange={(e) => setStitch(e.target.value)}
            >
              <option value="直线针">直线针</option>
              <option value="套针">套针</option>
              <option value="滚针">滚针</option>
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              required
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            我有权使用该图片，并会遵守素材的署名与使用许可。
          </label>
          <button id="generate" className="primary" disabled={isProcessing || !agreed}>
            生成工艺参考稿
          </button>
          {statusText && (
            <p id="create-status" role="status">
              {statusText}
            </p>
          )}
        </form>
      </div>

      {result && (
        <div id="result">
          <h2>工艺参考稿</h2>
          <div className="split">
            <div
              className="result-svg"
              dangerouslySetInnerHTML={{ __html: result.svg }}
            />
            <div className="card">
              <h3>参考评分 {result.score}/100</h3>
              <p>
                {result.paths.length}段针路 · {result.colors.length}种数字参考色
              </p>
              <p>
                {result.tips.map((tip: string, idx: number) => (
                  <React.Fragment key={idx}>
                    {tip}
                    <br />
                  </React.Fragment>
                ))}
              </p>
              <p>该评分不是可生产保证；先试绣小样。没有提交版权登记或上链。</p>
              <div className="row">
                <button id="save-svg" onClick={handleDownloadSVG}>
                  下载 SVG 绣稿
                </button>
                <button id="save-csv" onClick={handleDownloadCSV}>
                  下载针路 CSV
                </button>
              </div>
            </div>
          </div>
          {storySession && (
            <p className="row">
              <a className="btn primary" href="#ar/story">
                进入我的绣境
              </a>
              <button id="save-story-session" onClick={handleDownloadStorySession}>
                下载完整创作过程
              </button>
              <a className="btn" href="#create/text">
                返回调整纹样
              </a>
            </p>
          )}
        </div>
      )}
    </>
  );
};
