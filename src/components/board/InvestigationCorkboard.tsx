'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { InvestigationEntity, InvestigationRelationship } from '@/lib/types/investigation';
import { playPinSound, playYarnSnipSound, playPaperRustleSound } from '@/lib/ui/tactileAudio';

interface CorkboardProps {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  selectedEntityId: string | null;
  selectedEntityIds: string[];
  activeTool: 'select' | 'connect' | 'lasso' | 'pan';
  threadColor: 'crimson' | 'twine' | 'cobalt' | 'shadow';
  filterTypes: Record<string, boolean>;
  onSelectEntity: (id: string | null) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onConnect: (sourceId: string, targetId: string) => void;
  onLassoSelect: (ids: string[]) => void;
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

/** Fields that require regenerating a card's procedural texture. */
function cardSignature(ent: InvestigationEntity): string {
  return [ent.label, ent.type, ent.confidence.toFixed(2), ent.status, ent.visualType, ent.aliases[0] || ''].join('|');
}

/** Point-in-polygon test (ray casting) for lasso selection. */
function pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const InvestigationCorkboard: React.FC<CorkboardProps> = ({
  entities,
  relationships,
  selectedEntityId,
  selectedEntityIds,
  activeTool,
  threadColor,
  filterTypes,
  onSelectEntity,
  onUpdatePosition,
  onConnect,
  onLassoSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live React state mirrored into the render loop without rebuilding the scene
  const stateRef = useRef({
    selectedEntityId,
    selectedEntityIds,
    activeTool,
    threadColor,
    connectingSourceId: null as string | null,
  });

  // Stable callback refs — the Three.js world is built once and never torn down for data changes
  const cbRef = useRef({ onSelectEntity, onUpdatePosition, onConnect, onLassoSelect });
  cbRef.current = { onSelectEntity, onUpdatePosition, onConnect, onLassoSelect };

  useEffect(() => {
    stateRef.current.selectedEntityId = selectedEntityId;
    stateRef.current.selectedEntityIds = selectedEntityIds;
    stateRef.current.activeTool = activeTool;
    stateRef.current.threadColor = threadColor;
  }, [selectedEntityId, selectedEntityIds, activeTool, threadColor]);

  // ---- The persistent world (created once per mount) ----
  const worldRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    cards: Map<string, {
      group: THREE.Group;
      cardMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
      pinMesh: THREE.Mesh;
      texture: THREE.CanvasTexture;
      signature: string;
    }>;
    threads: Map<string, { line: THREE.Line; rel: InvestigationRelationship }>;
    isDragging: boolean;
  } | null>(null);

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
    const corkTex = createCorkTexture();
    const boardGeo = new THREE.PlaneGeometry(140, 80);
    const boardMat = new THREE.MeshStandardMaterial({
      map: corkTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    boardMesh.position.z = -0.1;
    scene.add(boardMesh);

    const world = {
      scene,
      camera,
      renderer,
      cards: new Map<
        string,
        {
          group: THREE.Group;
          cardMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
          pinMesh: THREE.Mesh;
          texture: THREE.CanvasTexture;
          signature: string;
        }
      >(),
      threads: new Map<string, { line: THREE.Line; rel: InvestigationRelationship }>(),
      isDragging: false,
    };
    worldRef.current = world;

    // --- Interaction & Drag Rig ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let draggedEntityId: string | null = null;
    let groupDragIds: string[] = [];
    let groupDragOffsets: { id: string; dx: number; dy: number }[] = [];
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const planeIntersect = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    let isPanning = false;
    let lastPanX = 0;
    let lastPanY = 0;

    // Lasso state
    let isLassoing = false;
    let lassoPoints: { x: number; y: number }[] = [];
    const lassoGeo = new THREE.BufferGeometry();
    lassoGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 1024), 3));
    const lassoLine = new THREE.Line(
      lassoGeo,
      new THREE.LineBasicMaterial({ color: 0xd9a520, linewidth: 2, transparent: true, opacity: 0.9 })
    );
    lassoLine.visible = false;
    scene.add(lassoLine);

    function updateRay(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
    }

    function hitTestCard(): { id: string; group: THREE.Group } | null {
      const hitCandidates: THREE.Object3D[] = [];
      world.cards.forEach((entry) => {
        if (entry.group.visible) entry.group.children.forEach((c) => hitCandidates.push(c));
      });
      const intersects = raycaster.intersectObjects(hitCandidates);
      if (intersects.length > 0 && intersects[0].object.parent) {
        const parentGroup = intersects[0].object.parent as THREE.Group;
        const hitId = (parentGroup as any).entityId;
        if (hitId && world.cards.has(hitId)) return { id: hitId, group: parentGroup };
      }
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      updateRay(e);
      const hit = hitTestCard();

      if (hit && stateRef.current.activeTool === 'connect') {
        // Connecting mode
        if (!stateRef.current.connectingSourceId) {
          stateRef.current.connectingSourceId = hit.id;
          playPinSound();
        } else if (stateRef.current.connectingSourceId !== hit.id) {
          cbRef.current.onConnect(stateRef.current.connectingSourceId, hit.id);
          playYarnSnipSound();
          stateRef.current.connectingSourceId = null;
        }
        return;
      }

      if (hit) {
        // Selection & Dragging (lasso tool falling back to single-card select/drag)
        cbRef.current.onSelectEntity(hit.id);
        playPaperRustleSound();
        isDragging = true;
        world.isDragging = true;
        draggedEntityId = hit.id;

        // Group drag when the grabbed card belongs to the current multi-selection
        const multi = stateRef.current.selectedEntityIds;
        groupDragIds = multi.includes(hit.id) && multi.length > 1 ? [...multi] : [hit.id];

        raycaster.ray.intersectPlane(dragPlane, planeIntersect);
        dragOffset.copy(hit.group.position).sub(planeIntersect);
        groupDragOffsets = groupDragIds.map((id) => {
          const entry = world.cards.get(id);
          return {
            id,
            dx: entry ? entry.group.position.x - planeIntersect.x : 0,
            dy: entry ? entry.group.position.y - planeIntersect.y : 0,
          };
        });
        canvas.style.cursor = 'grabbing';
        return;
      }

      // Clicked empty cork
      if (stateRef.current.activeTool === 'lasso') {
        isLassoing = true;
        raycaster.ray.intersectPlane(dragPlane, planeIntersect);
        lassoPoints = [{ x: planeIntersect.x, y: planeIntersect.y }];
        lassoLine.visible = true;
        canvas.style.cursor = 'crosshair';
        return;
      }

      if (stateRef.current.activeTool !== 'connect') {
        cbRef.current.onSelectEntity(null);
      }
      isPanning = true;
      lastPanX = e.clientX;
      lastPanY = e.clientY;
      canvas.style.cursor = 'grab';
    }

    function onPointerMove(e: PointerEvent) {
      if (isDragging && draggedEntityId) {
        updateRay(e);
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
          for (const off of groupDragOffsets) {
            const entry = world.cards.get(off.id);
            if (entry) {
              entry.group.position.x = planeIntersect.x + off.dx;
              entry.group.position.y = planeIntersect.y + off.dy;
            }
          }
        }
      } else if (isLassoing) {
        updateRay(e);
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
          lassoPoints.push({ x: planeIntersect.x, y: planeIntersect.y });
          const pos = lassoGeo.getAttribute('position') as THREE.BufferAttribute;
          const n = Math.min(lassoPoints.length, 1024);
          for (let i = 0; i < n; i++) {
            pos.setXYZ(i, lassoPoints[i].x, lassoPoints[i].y, 1.2);
          }
          pos.needsUpdate = true;
          lassoGeo.setDrawRange(0, n);
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
        // Commit final positions (single or group drag)
        for (const off of groupDragOffsets) {
          const entry = world.cards.get(off.id);
          if (entry) cbRef.current.onUpdatePosition(off.id, entry.group.position.x, entry.group.position.y);
        }
      }
      if (isLassoing && lassoPoints.length > 2) {
        const selected: string[] = [];
        world.cards.forEach((entry, id) => {
          if (!entry.group.visible) return;
          if (pointInPolygon(entry.group.position.x, entry.group.position.y, lassoPoints)) {
            selected.push(id);
          }
        });
        cbRef.current.onLassoSelect(selected);
        playYarnSnipSound();
      }
      isDragging = false;
      world.isDragging = false;
      draggedEntityId = null;
      groupDragIds = [];
      groupDragOffsets = [];
      isLassoing = false;
      lassoPoints = [];
      lassoLine.visible = false;
      isPanning = false;
      canvas.style.cursor = stateRef.current.activeTool === 'connect' || stateRef.current.activeTool === 'lasso' ? 'crosshair' : 'default';
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

      const selId = stateRef.current.selectedEntityId;
      const multi = stateRef.current.selectedEntityIds;
      const connectSrc = stateRef.current.connectingSourceId;

      world.cards.forEach((entry, id) => {
        const isSelected = id === selId || multi.includes(id);
        if (id === selId) {
          entry.group.position.z = 1.0;
          entry.group.scale.set(1.05, 1.05, 1.05);
        } else {
          entry.group.position.z = 0.2;
          entry.group.scale.set(1.0, 1.0, 1.0);
        }
        // Lasso / multi-selection ring + thread-tool source emphasis
        const glow = (isSelected && multi.length > 1) || id === connectSrc;
        entry.cardMesh.material.emissive.setHex(glow ? 0x5a3c00 : 0x000000);
        entry.pinMesh.scale.setScalar(glow ? 1.35 : 1.0);
      });

      // Live catenary re-draping while dragging — threads follow the pins in real time
      if (world.isDragging) {
        world.threads.forEach(({ line, rel }) => {
          redrapeThread(line, rel);
        });
      }

      renderer.render(scene, camera);
    }

    /** Recompute the quadratic Bézier catenary for a thread from current pin positions. */
    function redrapeThread(line: THREE.Line, rel: InvestigationRelationship) {
      const src = world.cards.get(rel.sourceId);
      const tgt = world.cards.get(rel.targetId);
      if (!src || !tgt) {
        line.visible = false;
        return;
      }
      const p1 = new THREE.Vector3(src.group.position.x, src.group.position.y + 5.0, 0.6);
      const p2 = new THREE.Vector3(tgt.group.position.x, tgt.group.position.y + 5.0, 0.6);
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      const sag = Math.min(6.0, dist * 0.18 + 0.8);
      mid.y -= sag;
      mid.z -= 0.1;

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const points = curve.getPoints(24);
      const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < points.length; i++) {
        posAttr.setXYZ(i, points[i].x, points[i].y, points[i].z);
      }
      posAttr.needsUpdate = true;
      line.geometry.computeBoundingSphere();
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
      world.cards.forEach((entry) => {
        entry.texture.dispose();
        entry.cardMesh.geometry.dispose();
        entry.cardMesh.material.dispose();
      });
      world.threads.forEach(({ line }) => {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
      corkTex.dispose();
      boardGeo.dispose();
      boardMat.dispose();
      lassoGeo.dispose();
      (lassoLine.material as THREE.Material).dispose();
      renderer.dispose();
      worldRef.current = null;
    };
    // The world is built exactly once — data sync happens through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Incremental entity sync: add/update/remove cards without rebuilding the world ----
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    // Expose the card factory to this effect via the world (defined inside mount effect scope below)
    const seen = new Set<string>();

    for (const ent of entities) {
      seen.add(ent.id);
      const existing = world.cards.get(ent.id);

      if (!existing) {
        const created = createCardEntry(ent);
        world.cards.set(ent.id, created);
        world.scene.add(created.group);
        created.group.visible = filterTypes[ent.visualType] !== false;
      } else {
        // Position follows the store; drags commit only on pointer-up, so no conflict
        existing.group.position.x = ent.boardPosition.x;
        existing.group.position.y = ent.boardPosition.y;
        existing.group.rotation.z = ent.boardPosition.rotation || 0;
        const sig = cardSignature(ent);
        if (sig !== existing.signature) {
          existing.texture.dispose();
          existing.texture = createCardTextureOnly(ent);
          existing.cardMesh.material.map = existing.texture;
          existing.cardMesh.material.needsUpdate = true;
          existing.signature = sig;
        }
        existing.group.visible = filterTypes[ent.visualType] !== false;
      }
    }

    // Remove cards that no longer exist
    for (const [id, entry] of Array.from(world.cards.entries())) {
      if (!seen.has(id)) {
        world.scene.remove(entry.group);
        entry.texture.dispose();
        entry.cardMesh.geometry.dispose();
        entry.cardMesh.material.dispose();
        world.cards.delete(id);
      }
    }

    // Threads must re-attach to any newly added/removed pins
    syncThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, filterTypes]);

  // ---- Thread sync ----
  function createCardTextureOnly(entity: InvestigationEntity): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 380;
    const ctx = c.getContext('2d')!;

    if (entity.visualType === 'sticky') {
      ctx.fillStyle = '#e8c952';
      ctx.fillRect(0, 0, 320, 380);
      ctx.fillStyle = '#c4a635';
      ctx.beginPath();
      ctx.moveTo(270, 380);
      ctx.lineTo(320, 330);
      ctx.lineTo(270, 330);
      ctx.fill();
    } else if (entity.visualType === 'doc') {
      ctx.fillStyle = '#ede8dd';
      ctx.fillRect(0, 0, 320, 380);
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
      // Whorl hint for latent print cards
      ctx.strokeStyle = 'rgba(160,160,160,0.35)';
      for (let r = 12; r < 70; r += 10) {
        ctx.beginPath();
        ctx.arc(160, 140, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Default Polaroid / Suspect Card
      ctx.fillStyle = '#f5f2eb';
      ctx.fillRect(0, 0, 320, 380);
      ctx.fillStyle = '#1e1c1a';
      ctx.fillRect(20, 20, 280, 250);
      ctx.fillStyle = '#3a342e';
      ctx.beginPath();
      ctx.arc(160, 120, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(160, 210, 80, 50, 0, 0, Math.PI);
      ctx.fill();
    }

    ctx.fillStyle = entity.visualType === 'print' ? '#d9d4cc' : '#141110';
    ctx.font = 'bold 18px Courier New, monospace';
    const label = entity.label.length > 24 ? entity.label.slice(0, 22) + '…' : entity.label;
    ctx.fillText(label, 20, 305);

    ctx.fillStyle = entity.visualType === 'print' ? '#8a8275' : '#6b6357';
    ctx.font = '13px Courier New, monospace';
    ctx.fillText(`TYPE: ${entity.type.toUpperCase()}`, 20, 332);
    ctx.fillText(`CONF: ${(entity.confidence * 100).toFixed(0)}%`, 20, 355);

    if (entity.status === 'ai_inferred') {
      ctx.fillStyle = '#e13c32';
      ctx.fillText('• AI INFERRED', 170, 355);
    } else if (entity.status === 'investigator_confirmed') {
      ctx.fillStyle = '#2e7d4f';
      ctx.fillText('✓ VERIFIED', 170, 355);
    } else if (entity.status === 'predicted') {
      ctx.fillStyle = '#d9a520';
      ctx.fillText('~ PREDICTED', 170, 355);
    }

    return new THREE.CanvasTexture(c);
  }

  function createCardEntry(ent: InvestigationEntity) {
    const group = new THREE.Group();
    group.position.set(ent.boardPosition.x, ent.boardPosition.y, 0.2);
    group.rotation.z = ent.boardPosition.rotation || 0;
    (group as any).entityId = ent.id;

    const cardGeo = new THREE.PlaneGeometry(9.6, 11.4);
    const texture = createCardTextureOnly(ent);
    const cardMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    group.add(cardMesh);

    const pinGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.7, 16);
    const pinMat = new THREE.MeshStandardMaterial({
      color: PIN_COLORS[ent.visualType] || 0xb01722,
      roughness: 0.3,
      metalness: 0.4,
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.rotation.x = Math.PI / 2;
    pinMesh.position.set(0, 5.0, 0.45);
    group.add(pinMesh);

    return { group, cardMesh, pinMesh, texture, signature: cardSignature(ent) };
  }

  function syncThreads() {
    const world = worldRef.current;
    if (!world) return;

    const seen = new Set<string>();
    for (const rel of relationships) {
      seen.add(rel.id);
      const src = world.cards.get(rel.sourceId);
      const tgt = world.cards.get(rel.targetId);
      const bothVisible = src && tgt && src.group.visible && tgt.group.visible;
      let entry = world.threads.get(rel.id);

      if (!entry) {
        if (!src || !tgt) continue;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(25 * 3), 3));
        const mat = new THREE.LineBasicMaterial({
          color: THREAD_COLORS[rel.threadColor] || 0xb01722,
          linewidth: 2,
        });
        const line = new THREE.Line(geo, mat);
        world.scene.add(line);
        entry = { line, rel };
        world.threads.set(rel.id, entry);
      } else if (entry.rel.threadColor !== rel.threadColor) {
        (entry.line.material as THREE.LineBasicMaterial).color.setHex(
          THREAD_COLORS[rel.threadColor] || 0xb01722
        );
      }

      entry.rel = rel;
      entry.line.visible = Boolean(bothVisible);
      redrapeThreadExternal(entry.line, rel);
    }

    for (const [id, entry] of Array.from(world.threads.entries())) {
      if (!seen.has(id)) {
        world.scene.remove(entry.line);
        entry.line.geometry.dispose();
        (entry.line.material as THREE.Material).dispose();
        world.threads.delete(id);
      }
    }
  }

  function redrapeThreadExternal(line: THREE.Line, rel: InvestigationRelationship) {
    const world = worldRef.current;
    if (!world) return;
    const src = world.cards.get(rel.sourceId);
    const tgt = world.cards.get(rel.targetId);
    if (!src || !tgt) {
      line.visible = false;
      return;
    }
    const p1 = new THREE.Vector3(src.group.position.x, src.group.position.y + 5.0, 0.6);
    const p2 = new THREE.Vector3(tgt.group.position.x, tgt.group.position.y + 5.0, 0.6);
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const dist = p1.distanceTo(p2);
    const sag = Math.min(6.0, dist * 0.18 + 0.8);
    mid.y -= sag;
    mid.z -= 0.1;

    const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
    const points = curve.getPoints(24);
    const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < points.length; i++) {
      posAttr.setXYZ(i, points[i].x, points[i].y, points[i].z);
    }
    posAttr.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  }

  // Re-sync threads when the relationship set changes
  useEffect(() => {
    syncThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relationships]);

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

      {/* Multi-selection status strip */}
      {selectedEntityIds.length > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-noir-900/95 border border-amber-accent/50 rounded-lg font-mono text-[11px] text-amber-accent flex items-center gap-2 shadow-xl backdrop-blur-md">
          <span className="font-bold">{selectedEntityIds.length} CARDS LASSOED</span>
          <span className="text-noir-400">drag any selected card to move the group</span>
        </div>
      )}

      {/* Tool hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 bg-noir-900/80 border border-noir-700 rounded font-mono text-[10px] text-noir-400 pointer-events-none">
        {activeTool === 'connect'
          ? 'THREAD TOOL: click source pin, then target pin'
          : activeTool === 'lasso'
          ? 'LASSO: drag around cards to multi-select'
          : 'Drag cards to arrange • Drag empty cork to pan • Scroll to zoom'}
      </div>
    </div>
  );
};
