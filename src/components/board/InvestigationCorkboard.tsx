'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { InvestigationEntity, InvestigationRelationship, BoardCardType } from '@/lib/types/investigation';
import { playPinSound, playYarnSnipSound, playPaperRustleSound } from '@/lib/ui/tactileAudio';

interface CorkboardProps {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  selectedEntityId: string | null;
  activeTool: 'select' | 'connect' | 'lasso' | 'pan';
  threadColor: 'crimson' | 'twine' | 'cobalt' | 'shadow';
  filterTypes: Record<string, boolean>;
  onSelectEntity: (id: string | null) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onConnect: (sourceId: string, targetId: string) => void;
}

const THREAD_COLORS: Record<string, number> = {
  crimson: 0xb01722,
  twine: 0xc9a76a,
  cobalt: 0x2f5f9e,
  shadow: 0x22201d,
};

const PIN_COLORS: Record<string, number> = {
  photo: 0xb01722,
  suspect: 0x1a1a1a,
  sticky: 0xd9a520,
  doc: 0x2f5f9e,
  news: 0xb01722,
  print: 0x1a1a1a,
  map: 0x2e7d4f,
  statement: 0x2f5f9e,
  bag: 0x8a5a20,
  key: 0xa8823c,
  plan: 0x2f5f9e,
};

export const InvestigationCorkboard: React.FC<CorkboardProps> = ({
  entities,
  relationships,
  selectedEntityId,
  activeTool,
  threadColor,
  filterTypes,
  onSelectEntity,
  onUpdatePosition,
  onConnect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    selectedEntityId,
    activeTool,
    threadColor,
    connectingSourceId: null as string | null,
  });

  // Keep stateRef fresh for Three.js render loop & event listeners
  useEffect(() => {
    stateRef.current.selectedEntityId = selectedEntityId;
    stateRef.current.activeTool = activeTool;
    stateRef.current.threadColor = threadColor;
  }, [selectedEntityId, activeTool, threadColor]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let isDisposed = false;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    // --- Texture Generator Helpers ---
    function createCorkTexture(): THREE.CanvasTexture {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#1c1713';
      ctx.fillRect(0, 0, 512, 512);

      // Noise grain
      for (let i = 0; i < 45000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 2 + 0.5;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(42,35,28,0.7)' : 'rgba(15,12,10,0.6)';
        ctx.fillRect(x, y, s, s);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 4);
      return tex;
    }

    function createCardTexture(entity: InvestigationEntity): THREE.CanvasTexture {
      const c = document.createElement('canvas');
      c.width = 320;
      c.height = 380;
      const ctx = c.getContext('2d')!;

      // Background styling by visualType
      if (entity.visualType === 'sticky') {
        ctx.fillStyle = '#e8c952';
        ctx.fillRect(0, 0, 320, 380);
        // Fold corner
        ctx.fillStyle = '#c4a635';
        ctx.beginPath();
        ctx.moveTo(270, 380);
        ctx.lineTo(320, 330);
        ctx.lineTo(270, 330);
        ctx.fill();
      } else if (entity.visualType === 'doc') {
        ctx.fillStyle = '#ede8dd';
        ctx.fillRect(0, 0, 320, 380);
        // Red Classified stamp
        ctx.strokeStyle = 'rgba(190, 30, 30, 0.4)';
        ctx.lineWidth = 3;
        ctx.strokeRect(180, 20, 120, 40);
        ctx.fillStyle = 'rgba(190, 30, 30, 0.5)';
        ctx.font = 'bold 16px Courier New';
        ctx.fillText('CONFIDENTIAL', 188, 45);
      } else if (entity.visualType === 'print') {
        ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, 320, 380);
        ctx.strokeStyle = '#383838';
        ctx.strokeRect(8, 8, 304, 364);
      } else {
        // Default Polaroid / Suspect Card
        ctx.fillStyle = '#f5f2eb';
        ctx.fillRect(0, 0, 320, 380);
        // Photo area
        ctx.fillStyle = '#1e1c1a';
        ctx.fillRect(20, 20, 280, 250);

        // Subject silhouette or icon
        ctx.fillStyle = '#3a342e';
        ctx.beginPath();
        ctx.arc(160, 120, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(160, 210, 80, 50, 0, 0, Math.PI);
        ctx.fill();
      }

      // Title & Label
      ctx.fillStyle = entity.visualType === 'print' ? '#d9d4cc' : '#141110';
      ctx.font = 'bold 18px Courier New, monospace';
      const label = entity.label.length > 24 ? entity.label.slice(0, 22) + '…' : entity.label;
      ctx.fillText(label, 20, 305);

      // Metadata / Tags
      ctx.fillStyle = entity.visualType === 'print' ? '#8a8275' : '#6b6357';
      ctx.font = '13px Courier New, monospace';
      ctx.fillText(`TYPE: ${entity.type.toUpperCase()}`, 20, 332);

      const confText = `CONF: ${(entity.confidence * 100).toFixed(0)}%`;
      ctx.fillText(confText, 20, 355);

      if (entity.status === 'ai_inferred') {
        ctx.fillStyle = '#e13c32';
        ctx.fillText('• AI INFERRED', 170, 355);
      } else if (entity.status === 'investigator_confirmed') {
        ctx.fillStyle = '#2e7d4f';
        ctx.fillText('✓ VERIFIED', 170, 355);
      }

      return new THREE.CanvasTexture(c);
    }

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0a09);

    const camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, -6, 92);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const ambient = new THREE.AmbientLight(0xfff3e6, 0.7);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff8ee, 0.8);
    dirLight.position.set(20, 40, 60);
    scene.add(dirLight);

    // Corkboard mesh
    const BOARD_W = 140;
    const BOARD_H = 80;
    const corkTex = createCorkTexture();
    const boardGeo = new THREE.PlaneGeometry(BOARD_W, BOARD_H);
    const boardMat = new THREE.MeshStandardMaterial({
      map: corkTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    boardMesh.position.z = -0.1;
    scene.add(boardMesh);

    // Meshes Registry
    const itemMeshes = new Map<string, THREE.Group>();
    const pinMeshes = new Map<string, THREE.Mesh>();
    const ropeLines: THREE.Line[] = [];

    // Render Entities
    entities.forEach((ent) => {
      if (filterTypes[ent.visualType] === false) return;

      const group = new THREE.Group();
      group.position.set(ent.boardPosition.x, ent.boardPosition.y, 0.2);
      group.rotation.z = ent.boardPosition.rotation || 0;
      (group as any).entityId = ent.id;

      // Card Geometry (width: 9.6, height: 11.4)
      const cardGeo = new THREE.PlaneGeometry(9.6, 11.4);
      const cardTex = createCardTexture(ent);
      const cardMat = new THREE.MeshStandardMaterial({
        map: cardTex,
        roughness: 0.6,
      });
      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      group.add(cardMesh);

      // Pin at top center
      const pinGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.7, 16);
      const pinColor = PIN_COLORS[ent.visualType] || 0xb01722;
      const pinMat = new THREE.MeshStandardMaterial({
        color: pinColor,
        roughness: 0.3,
        metalness: 0.4,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.rotation.x = Math.PI / 2;
      pinMesh.position.set(0, 5.0, 0.45);
      group.add(pinMesh);

      scene.add(group);
      itemMeshes.set(ent.id, group);
      pinMeshes.set(ent.id, pinMesh);
    });

    // Render Relationships as Catenary Draping Threads (Verlet Curves)
    relationships.forEach((rel) => {
      const srcMesh = itemMeshes.get(rel.sourceId);
      const tgtMesh = itemMeshes.get(rel.targetId);
      if (!srcMesh || !tgtMesh) return;

      const p1 = new THREE.Vector3(srcMesh.position.x, srcMesh.position.y + 5.0, 0.6);
      const p2 = new THREE.Vector3(tgtMesh.position.x, tgtMesh.position.y + 5.0, 0.6);

      // Interpolate draping curve
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      const sag = Math.min(6.0, dist * 0.18 + 0.8);
      mid.y -= sag;
      mid.z -= 0.1;

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const points = curve.getPoints(24);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const threadCol = THREAD_COLORS[rel.threadColor] || 0xb01722;

      const lineMat = new THREE.LineBasicMaterial({
        color: threadCol,
        linewidth: 2,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
      ropeLines.push(line);
    });

    // --- Interaction & Drag Rig ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let draggedEntityId: string | null = null;
    let dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    let planeIntersect = new THREE.Vector3();
    let dragOffset = new THREE.Vector3();
    let isPanning = false;
    let lastPanX = 0;
    let lastPanY = 0;

    function onPointerDown(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check hit on evidence cards
      const hitCandidates: THREE.Object3D[] = [];
      itemMeshes.forEach((mesh) => {
        mesh.children.forEach((c) => hitCandidates.push(c));
      });

      const intersects = raycaster.intersectObjects(hitCandidates);

      if (intersects.length > 0 && intersects[0].object.parent) {
        const parentGroup = intersects[0].object.parent as THREE.Group;
        const hitId = (parentGroup as any).entityId;

        if (stateRef.current.activeTool === 'connect') {
          // Connecting mode
          if (!stateRef.current.connectingSourceId) {
            stateRef.current.connectingSourceId = hitId;
            playPinSound();
          } else if (stateRef.current.connectingSourceId !== hitId) {
            onConnect(stateRef.current.connectingSourceId, hitId);
            playYarnSnipSound();
            stateRef.current.connectingSourceId = null;
          }
          return;
        }

        // Selection & Dragging
        onSelectEntity(hitId);
        playPaperRustleSound();
        isDragging = true;
        draggedEntityId = hitId;

        raycaster.ray.intersectPlane(dragPlane, planeIntersect);
        dragOffset.copy(parentGroup.position).sub(planeIntersect);
        canvas.style.cursor = 'grabbing';
      } else {
        // Clicked empty cork: start panning
        if (stateRef.current.activeTool !== 'connect') {
          onSelectEntity(null);
        }
        isPanning = true;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        canvas.style.cursor = 'grab';
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (isDragging && draggedEntityId) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
          const mesh = itemMeshes.get(draggedEntityId);
          if (mesh) {
            const newX = planeIntersect.x + dragOffset.x;
            const newY = planeIntersect.y + dragOffset.y;
            mesh.position.x = newX;
            mesh.position.y = newY;
          }
        }
      } else if (isPanning) {
        const dx = e.clientX - lastPanX;
        const dy = e.clientY - lastPanY;
        lastPanX = e.clientX;
        lastPanY = e.clientY;

        camera.position.x -= dx * 0.08;
        camera.position.y += dy * 0.08;
      }
    }

    function onPointerUp() {
      if (isDragging && draggedEntityId) {
        const mesh = itemMeshes.get(draggedEntityId);
        if (mesh) {
          onUpdatePosition(draggedEntityId, mesh.position.x, mesh.position.y);
        }
      }
      isDragging = false;
      draggedEntityId = null;
      isPanning = false;
      canvas.style.cursor = stateRef.current.activeTool === 'connect' ? 'crosshair' : 'default';
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.05;
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + zoomDelta, 30, 150);
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // --- Render Loop ---
    let frameId = 0;
    function animate() {
      if (isDisposed) return;
      frameId = requestAnimationFrame(animate);

      // Highlight selected entity with subtle bounce/glow
      const selId = stateRef.current.selectedEntityId;
      itemMeshes.forEach((mesh, id) => {
        if (id === selId) {
          mesh.position.z = 1.0;
          mesh.scale.set(1.05, 1.05, 1.05);
        } else {
          mesh.position.z = 0.2;
          mesh.scale.set(1.0, 1.0, 1.0);
        }
      });

      renderer.render(scene, camera);
    }
    animate();

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    ro.observe(container);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [entities, relationships, filterTypes, onSelectEntity, onUpdatePosition, onConnect]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-noir-900 select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" />

      {/* Cinematic Vignette & Ambient Glare */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse 120% 90% at 50% 45%, transparent 45%, rgba(12,10,9,0.4) 75%, rgba(12,10,9,0.85) 100%)',
        }}
      />
    </div>
  );
};
