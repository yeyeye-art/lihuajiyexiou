import * as THREE from '../vendor/three/build/three.module.js';

export function createXiaoli3D(container, options = {}) {
  const { modelPath = new URL('../models/xiaoli.glb', import.meta.url).href, reducedMotion = false, modelRotationY = 0, keepFacing = false } = options;

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.classList.add('xiaoli-3d-canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const w = container.clientWidth || 300;
  const h = container.clientHeight || 400;

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 1.2, 3.5);
  camera.lookAt(0, 0.8, 0);

  // 统一灯光：和梨宝调色方案一致
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xf5f1e3, 1.0);
  dirLight.position.set(2, 4, 3);
  scene.add(dirLight);
  const fillLight = new THREE.PointLight(0xd8f0e0, 0.6, 0);
  fillLight.position.set(-1, 1.5, 2);
  scene.add(fillLight);

  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  // 光圈（聆听/说话时显示的光环）
  const ringGeo = new THREE.RingGeometry(1.15, 1.22, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x8EAF9E,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.9;
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  // 状态机：idle / speaking / listening
  let state = 'idle';

  let rafId = 0;
  let disposed = false;

  function resize() {
    if (!container || disposed) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return;
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    if (reducedMotion) renderer.render(scene, camera);
  }

  resize();

  const resizeObserver = ('ResizeObserver' in window)
    ? new ResizeObserver(resize)
    : null;
  if (resizeObserver) resizeObserver.observe(container);
  window.addEventListener('resize', resize);

  function applyShadowFlags(obj) {
    obj.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
  }

  function centerAndScale(gltfScene) {
    const box = new THREE.Box3().setFromObject(gltfScene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetHeight = 2;
    const scale = targetHeight / size.y;
    gltfScene.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(gltfScene);
    const center2 = new THREE.Vector3();
    box2.getCenter(center2);
    gltfScene.position.x -= center2.x;
    gltfScene.position.z -= center2.z;
    gltfScene.position.y -= box2.min.y;
  }

  function addFallbackModel() {
    const geo = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.y = 0;
    modelGroup.add(mesh);
  }

  async function loadModel() {
    let GLTFLoader;
    try {
      const mod = await import('../vendor/three/examples/jsm/loaders/GLTFLoader.js');
      GLTFLoader = mod.GLTFLoader;
    } catch (e) {
      if (disposed) return;
      console.warn('[xiaoli-3d] GLTFLoader 动态导入失败，回退占位:', e.message);
      addFallbackModel();
      if (reducedMotion) renderer.render(scene, camera);
      return;
    }

    const loader = new GLTFLoader();

    // 尝试加载 meshopt 解码器，支持压缩的 GLB
    try {
      const meshoptMod = await import('../vendor/three/examples/jsm/libs/meshopt_decoder.module.js');
      loader.setMeshoptDecoder(meshoptMod.MeshoptDecoder);
    } catch {
      // meshopt 不存在，GLB 若无压缩则仍可加载
    }

    loader.load(
      modelPath,
      (gltf) => {
        const gltfScene = gltf.scene || gltf.scenes?.[0];
        if (disposed) { if(gltfScene)releaseObjects(gltfScene); return; }
        if (!gltfScene) {
          console.warn('[xiaoli-3d] GLB 场景为空，回退占位');
          addFallbackModel();
        } else {
          applyShadowFlags(gltfScene);
          gltfScene.rotation.y = modelRotationY;
          centerAndScale(gltfScene);
          modelGroup.add(gltfScene);
          container.dataset.modelLoaded = 'true';
        }
        if (reducedMotion) renderer.render(scene, camera);
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.warn('[xiaoli-3d] GLB 加载失败，已回退到占位几何体:', error.message);
        addFallbackModel();
        if (reducedMotion) renderer.render(scene, camera);
      }
    );
  }

  loadModel();

  const clock = new THREE.Clock();

  function tick() {
    if (disposed) return;
    const time = clock.getElapsedTime();

    // 根据状态做不同动画
    if (state === 'idle') {
      // 呼吸 + 自转
      modelGroup.position.y = Math.sin(time * 1.5) * 0.05;
      modelGroup.rotation.y = keepFacing ? Math.sin(time * .7) * .025 : modelGroup.rotation.y + .003;
      ring.material.opacity = Math.max(0, ring.material.opacity - 0.04);
    } else if (state === 'speaking') {
      // 说话：整体轻微脉动缩放 + 光圈亮起来 + 快速自转
      const pulse = 1 + Math.sin(time * 8) * 0.04;
      modelGroup.scale.setScalar(pulse);
      modelGroup.position.y = Math.sin(time * 4) * 0.08;
      modelGroup.rotation.y = keepFacing ? Math.sin(time * 1.4) * .04 : modelGroup.rotation.y + .008;
      ring.material.opacity = Math.min(0.55, ring.material.opacity + 0.05);
      ring.scale.setScalar(1 + Math.sin(time * 6) * 0.08);
      ring.rotation.z += 0.04;
    } else if (state === 'listening') {
      // 聆听：左右微摆 + 光圈呼吸 + 自转减慢
      const sway = Math.sin(time * 2.5) * 0.12;
      modelGroup.rotation.y = sway;
      modelGroup.position.y = Math.sin(time * 3) * 0.06;
      modelGroup.scale.setScalar(1 + Math.sin(time * 5) * 0.02);
      ring.material.opacity = Math.min(0.8, ring.material.opacity + 0.06);
      ring.scale.setScalar(1 + Math.sin(time * 4 + Math.PI) * 0.12);
      ring.rotation.z -= 0.06;
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }

  if (reducedMotion) {
    renderer.render(scene, camera);
  } else {
    rafId = requestAnimationFrame(tick);
  }

  // 公共 API：设置状态
  function setState(newState) {
    if (newState === state) return;
    state = newState;
    // 说话/聆听时重置自转累积值，让切换更平滑
    if (newState === 'idle') {
      modelGroup.scale.setScalar(1);
    }
    container?.setAttribute?.('data-xiaoli-state', newState);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    if (resizeObserver) resizeObserver.disconnect();

    releaseObjects(scene);
    renderer.dispose();
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  function releaseObjects(object) {
    object.traverse((node) => {
      if (node.isMesh) {
        if (node.geometry) node.geometry.dispose();
        if (Array.isArray(node.material)) {
          node.material.forEach(disposeMaterial);
        } else if (node.material) {
          disposeMaterial(node.material);
        }
      }
    });

  }
  function disposeMaterial(material) {
    for(const value of Object.values(material))if(value?.isTexture)value.dispose();
    material.dispose();
  }

  return { dispose, setState };
}
