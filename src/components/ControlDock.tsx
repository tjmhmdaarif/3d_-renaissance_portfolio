import {
  ChevronDown,
  ChevronUp,
  Layers,
  Maximize2,
  Monitor,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { EXHIBITION_CHAPTERS } from '../data/chapters';
import { PORTFOLIO_CHAPTERS } from '../data/portfolio';

interface ControlDockProps {
  progress: number;
  isPlaying: boolean;
  isCollapsed: boolean;
  pureArtMode: boolean;
  isDrawerOpen: boolean;
  frameMode: '16:9' | 'full';
  reliefMode: 'subtle' | 'sculpted';
  onTogglePlay: () => void;
  onReplay: () => void;
  onScrub: (nextProgress: number) => void;
  onSelectChapter: (index: number) => void;
  onToggleFrameMode: () => void;
  onToggleReliefMode: () => void;
  onToggleCollapse: () => void;
}

export function ControlDock({
  progress,
  isPlaying,
  isCollapsed,
  pureArtMode,
  isDrawerOpen,
  frameMode,
  reliefMode,
  onTogglePlay,
  onReplay,
  onScrub,
  onSelectChapter,
  onToggleFrameMode,
  onToggleReliefMode,
  onToggleCollapse,
}: ControlDockProps) {
  const hidden = pureArtMode || isDrawerOpen;

  return (
    <div
      aria-hidden={hidden}
      className={`pointer-events-none fixed inset-x-0 bottom-2.5 z-30 flex flex-col items-center px-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:inset-x-auto md:right-6 md:bottom-5 md:w-[min(495px,calc(100vw-250px))] md:items-end md:px-0 ${
        hidden ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Top control row: always keeps Play/Pause accessible even when minimized */}
      <div
        className={`mb-1.5 flex items-center gap-1.5 ${
          hidden ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        {isCollapsed && (
          <button
            type="button"
            onClick={onTogglePlay}
            onMouseUp={(e) => e.currentTarget.blur()}
            tabIndex={hidden ? -1 : 0}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? 'Pause tour' : 'Play 30-second tour'}
            title={isPlaying ? 'Pause Tour (Space)' : 'Play Tour (Space)'}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[#E5C17B]/65 bg-[#E5C17B] px-2.5 text-[11px] font-semibold tracking-wide text-[#12100E] shadow-lg transition-colors hover:bg-[#f0cf8e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF6EE]"
          >
            {isPlaying ? (
              <Pause className="h-3 w-3 fill-current" aria-hidden="true" />
            ) : (
              <Play className="h-3 w-3 fill-current" aria-hidden="true" />
            )}
            <span>{isPlaying ? 'Pause' : 'Play Tour'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          tabIndex={hidden ? -1 : 0}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Show playback controls' : 'Minimize playback controls'}
          title={isCollapsed ? 'Show playback dock' : 'Minimize playback dock'}
          className="inline-flex h-7 w-9 cursor-pointer items-center justify-center rounded-md border border-[#DAB978]/22 bg-[#14110E]/84 text-[#E2D9CB] transition-colors hover:border-[#E5C17B]/60 hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5C17B]"
        >
          {isCollapsed ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Compact transport + chapter scrubber dock */}
      {!isCollapsed && (
        <div
          role="region"
          aria-label="Playback and framing controls"
          className={`flex w-full items-center justify-between gap-2.5 rounded-xl border border-[#DAB978]/24 bg-[#14110E]/86 px-3 py-2 shadow-[0_14px_38px_rgba(0,0,0,0.52)] ${
            hidden ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          {/* Transport buttons */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePlay}
              onMouseUp={(e) => e.currentTarget.blur()}
              tabIndex={hidden ? -1 : 0}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? 'Pause tour' : 'Play 30-second tour'}
              title={isPlaying ? 'Pause (Space)' : 'Play 30s tour (Space)'}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-[#E5C17B] px-2.5 text-xs font-semibold tracking-wide text-[#12100E] transition-colors hover:bg-[#f0cf8e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF6EE]"
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              )}
              <span>{isPlaying ? 'Pause' : 'Play Tour'}</span>
            </button>

            <button
              type="button"
              onClick={onReplay}
              tabIndex={hidden ? -1 : 0}
              aria-label="Restart tour"
              title="Restart 30s tour"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#EBE2D0]/15 bg-[#1D1814] text-[#E2D9CB] transition-colors hover:border-[#E5C17B]/60 hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5C17B]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Chapter dots + smooth timeline scrubber */}
          <div className="flex min-w-[110px] flex-1 flex-col gap-1.5 px-0.5">
            <div className="flex items-center justify-between px-0.5">
              {EXHIBITION_CHAPTERS.map((ch) => {
                const seg = 1 / EXHIBITION_CHAPTERS.length;
                const active =
                  progress >= ch.index * seg &&
                  (progress < (ch.index + 1) * seg ||
                    (ch.index === EXHIBITION_CHAPTERS.length - 1 &&
                      progress >= 0.999));
                const folioMeta = PORTFOLIO_CHAPTERS[ch.index];
                const label = folioMeta
                  ? `Chapter ${folioMeta.roman}: ${folioMeta.portfolioTitle}`
                  : `Section ${ch.index + 1}`;
                return (
                  <button
                    key={ch.index}
                    type="button"
                    tabIndex={hidden ? -1 : 0}
                    onClick={() => onSelectChapter(ch.index)}
                    aria-label={`Jump to ${label}`}
                    title={label}
                    className="flex h-3.5 w-5 cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-[#E5C17B]"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all ${
                        active
                          ? 'w-4 bg-[#E5C17B]'
                          : 'w-1.5 bg-[#EBE2D0]/30 hover:bg-[#EBE2D0]/65'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={progress}
              tabIndex={hidden ? -1 : 0}
              aria-label="Tour timeline"
              onChange={(e) => onScrub(parseFloat(e.target.value))}
              className="exhibition-scrubber w-full"
            />
          </div>

          {/* Relief & 16:9 viewport icons */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleReliefMode}
              tabIndex={hidden ? -1 : 0}
              aria-label="Toggle 3D relief depth"
              title={
                reliefMode === 'sculpted'
                  ? '3D Relief: Sculpted'
                  : '3D Relief: Subtle'
              }
              className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5C17B] ${
                reliefMode === 'sculpted'
                  ? 'border-[#E5C17B]/60 bg-[#E5C17B]/15 text-[#E5C17B]'
                  : 'border-[#EBE2D0]/15 bg-[#1D1814] text-[#E2D9CB] hover:border-[#E5C17B]/60'
              }`}
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onToggleFrameMode}
              tabIndex={hidden ? -1 : 0}
              aria-label="Toggle 16:9 frame or full viewport"
              title={frameMode === '16:9' ? '16:9 Cinema Frame' : 'Full Viewport'}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[#EBE2D0]/15 bg-[#1D1814] text-[#E5C17B] transition-colors hover:border-[#E5C17B]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5C17B]"
            >
              {frameMode === '16:9' ? (
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
