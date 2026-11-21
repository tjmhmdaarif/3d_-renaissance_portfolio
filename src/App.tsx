/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlDock } from './components/ControlDock';
import {
  CodexFolioDrawer,
  type DrawerMode,
} from './components/portfolio/CodexFolioDrawer';
import { ContactModal } from './components/portfolio/ContactModal';
import { SkyCanvasOverlay } from './components/portfolio/SkyCanvasOverlay';
import { TopNav } from './components/portfolio/TopNav';
import {
  EXHIBITION_CHAPTERS,
  TOUR_DURATION_SECONDS,
} from './data/chapters';
import { ExhibitionStage } from './three/ExhibitionStage';

function getActiveChapterIndex(progress: number): number {
  const seg = 1 / EXHIBITION_CHAPTERS.length;
  return Math.min(
    EXHIBITION_CHAPTERS.length - 1,
    Math.max(0, Math.floor(progress / seg)),
  );
}

export default function App() {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pureArtMode, setPureArtMode] = useState(false);
  const [frameMode, setFrameMode] = useState<'16:9' | 'full'>('16:9');
  const [reliefMode, setReliefMode] = useState<'subtle' | 'sculpted'>('sculpted');

  const [drawerMode, setDrawerMode] = useState<DrawerMode>('closed');
  const [drawerChapterIndex, setDrawerChapterIndex] = useState(0);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const targetProgressRef = useRef(0);
  const isPlayingRef = useRef(false);
  const overlayBlockingRef = useRef(false);
  const touchYRef = useRef<number | null>(null);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    overlayBlockingRef.current = drawerMode !== 'closed' || isContactOpen;
  }, [drawerMode, isContactOpen]);

  // 30-second choreographed tour clock
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const next = targetProgressRef.current + dt / TOUR_DURATION_SECONDS;
      if (next >= 1) {
        targetProgressRef.current = 1;
        setProgress(1);
        setIsPlaying(false);
        return;
      }

      targetProgressRef.current = next;
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const jumpToChapter = useCallback((index: number) => {
    setIsPlaying(false);
    const seg = 1 / EXHIBITION_CHAPTERS.length;
    const center = Math.min(0.995, index * seg + seg * 0.25);
    targetProgressRef.current = center;
    setProgress(center);
  }, []);

  // Wheel, touch, & keyboard navigation (yields cleanly when Drawer or Contact Modal is open)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (overlayBlockingRef.current) {
        return;
      }
      e.preventDefault();
      if (isPlayingRef.current) {
        setIsPlaying(false);
      }
      const delta = (e.deltaY + e.deltaX * 0.5) * 0.00045;
      const next = Math.max(0, Math.min(1, targetProgressRef.current + delta));
      targetProgressRef.current = next;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (overlayBlockingRef.current) return;
      if (e.touches.length === 1) {
        touchYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (overlayBlockingRef.current) return;
      if (e.touches.length !== 1 || touchYRef.current === null) return;
      const dy = touchYRef.current - e.touches[0].clientY;
      touchYRef.current = e.touches[0].clientY;
      if (Math.abs(dy) > 1 && isPlayingRef.current) {
        setIsPlaying(false);
      }
      const next = Math.max(0, Math.min(1, targetProgressRef.current + dy * 0.0012));
      targetProgressRef.current = next;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        if (e.key === 'Escape') {
          setIsContactOpen(false);
          setDrawerMode('closed');
        }
        return;
      }
      if (e.key === 'Escape' && overlayBlockingRef.current) {
        setIsContactOpen(false);
        setDrawerMode('closed');
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setPureArtMode((prev) => {
          const next = !prev;
          if (next) {
            setDrawerMode('closed');
            setIsContactOpen(false);
          }
          return next;
        });
        return;
      }
      if (overlayBlockingRef.current) {
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => {
          if (!prev && targetProgressRef.current >= 0.995) {
            targetProgressRef.current = 0;
            setProgress(0);
          }
          return !prev;
        });
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsPlaying(false);
        const curr = getActiveChapterIndex(targetProgressRef.current);
        const nextIdx = Math.min(EXHIBITION_CHAPTERS.length - 1, curr + 1);
        targetProgressRef.current = nextIdx / EXHIBITION_CHAPTERS.length + 0.035;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsPlaying(false);
        const curr = getActiveChapterIndex(targetProgressRef.current);
        const prevIdx = Math.max(0, curr - 1);
        targetProgressRef.current = prevIdx / EXHIBITION_CHAPTERS.length + 0.035;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && targetProgressRef.current >= 0.995) {
        targetProgressRef.current = 0;
        setProgress(0);
      }
      return !prev;
    });
  }, []);

  const handleReplay = useCallback(() => {
    targetProgressRef.current = 0;
    setProgress(0);
    setIsPlaying(true);
  }, []);

  const handleScrub = useCallback((nextProgress: number) => {
    setIsPlaying(false);
    const clamped = Math.max(0, Math.min(1, nextProgress));
    targetProgressRef.current = clamped;
    setProgress(clamped);
  }, []);

  const handleSyncProgress = useCallback((smoothed: number) => {
    setProgress((prev) => (Math.abs(prev - smoothed) > 0.0015 ? smoothed : prev));
  }, []);

  const handleInspectChapter = useCallback(
    (index: number, projectId?: string) => {
      setIsPlaying(false);
      setPureArtMode(false);
      setIsContactOpen(false);
      setDrawerChapterIndex(index);
      setFocusedProjectId(projectId ?? null);
      setDrawerMode('chapter');
    },
    [],
  );

  const handleOpenAllProjects = useCallback(() => {
    setIsPlaying(false);
    setPureArtMode(false);
    setIsContactOpen(false);
    setFocusedProjectId(null);
    setDrawerChapterIndex(getActiveChapterIndex(targetProgressRef.current));
    setDrawerMode('all-projects');
  }, []);

  const handleOpenContact = useCallback(() => {
    setIsPlaying(false);
    setPureArtMode(false);
    setDrawerMode('closed');
    setIsContactOpen(true);
  }, []);

  const handleDrawerSelectChapter = useCallback(
    (index: number) => {
      setFocusedProjectId(null);
      setDrawerChapterIndex(index);
      jumpToChapter(index);
    },
    [jumpToChapter],
  );

  const activeIndex = getActiveChapterIndex(progress);
  const activeChapter = EXHIBITION_CHAPTERS[activeIndex];
  const isDrawerOpen = drawerMode !== 'closed';
  const isModalOrDrawerOpen = isDrawerOpen || isContactOpen;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#12100E] text-[#FAF6EE]">
      {/* Persistent Minimal Header */}
      <TopNav
        pureArtMode={pureArtMode}
        isDrawerOpen={isDrawerOpen}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onOpenAllProjects={handleOpenAllProjects}
        onTogglePureArt={() => {
          setPureArtMode((prev) => {
            const next = !prev;
            if (next) {
              setDrawerMode('closed');
              setIsContactOpen(false);
            }
            return next;
          });
        }}
      />

      {/* Unobstructed 3D Parallax Exhibition Canvas */}
      <main
        className={`relative flex min-h-0 flex-1 items-center justify-center ${
          frameMode === '16:9' ? 'p-2' : 'p-0'
        }`}
      >
        <ExhibitionStage
          targetProgressRef={targetProgressRef}
          isPlayingRef={isPlayingRef}
          reliefMode={reliefMode}
          frameMode={frameMode}
          activeChapter={activeChapter}
          onSyncProgress={handleSyncProgress}
        />
      </main>

      {/* Editorial Sky-Canvas Motion System + Parallax Margin Glass Cards */}
      <SkyCanvasOverlay
        progress={progress}
        pureArtMode={pureArtMode}
        isModalOrDrawerOpen={isModalOrDrawerOpen}
        onInspectChapter={handleInspectChapter}
        onOpenContact={handleOpenContact}
      />

      {/* Playback & Chapter Scrubber Dock */}
      <ControlDock
        progress={progress}
        isPlaying={isPlaying}
        isCollapsed={isCollapsed}
        pureArtMode={pureArtMode}
        isDrawerOpen={isModalOrDrawerOpen}
        frameMode={frameMode}
        reliefMode={reliefMode}
        onTogglePlay={handleTogglePlay}
        onReplay={handleReplay}
        onScrub={handleScrub}
        onSelectChapter={jumpToChapter}
        onToggleFrameMode={() =>
          setFrameMode((m) => (m === '16:9' ? 'full' : '16:9'))
        }
        onToggleReliefMode={() =>
          setReliefMode((r) => (r === 'sculpted' ? 'subtle' : 'sculpted'))
        }
        onToggleCollapse={() => setIsCollapsed((c) => !c)}
      />

      {/* Tier 2: Slide-Over Phase Folio Glass Drawer */}
      <CodexFolioDrawer
        mode={drawerMode}
        chapterIndex={drawerChapterIndex}
        focusedProjectId={focusedProjectId}
        onClose={() => {
          setFocusedProjectId(null);
          setDrawerMode('closed');
        }}
        onSwitchMode={(nextMode) => {
          setFocusedProjectId(null);
          setDrawerMode(nextMode);
        }}
        onSelectChapter={handleDrawerSelectChapter}
      />

      {/* Dedicated Contact & Resume Request Panel */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
}
