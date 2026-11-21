import { ArrowUp, RotateCcw } from 'lucide-react';
import { type PointerEvent as ReactPointerEvent, useRef } from 'react';
import {
  NARRATIVE_STAGES,
  type NarrativeStage,
} from '../data/solarSystem';

interface OriginHudProps {
  progress: number;
  activeStage: NarrativeStage;
  timeScale: 1 | 100 | 1000;
  showOrbits: boolean;
  onChangeTimeScale: (scale: 1 | 100 | 1000) => void;
  onToggleOrbits: () => void;
  onSelectProgress: (p: number) => void;
  onReignite: () => void;
}

const TIME_SCALES: Array<1 | 100 | 1000> = [1, 100, 1000];

export function OriginHud({
  progress,
  activeStage,
  timeScale,
  showOrbits,
  onChangeTimeScale,
  onToggleOrbits,
  onSelectProgress,
  onReignite,
}: OriginHudProps) {
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const scrubFromClientY = (clientY: number) => {
    const el = rulerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return;
    const next = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    onSelectProgress(next);
  };

  const handleRulerPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubFromClientY(e.clientY);
  };

  const handleRulerPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    scrubFromClientY(e.clientY);
  };

  const handleRulerPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const pct = Math.round(progress * 100);
  const isVoid = progress >= 0.955;
  const isSingularity = progress >= 0.82 && progress < 0.955;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Brutalist Telemetry Ribbon */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 border-b border-white/12 pb-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onSelectProgress(0)}
            className="text-left focus:outline-none"
          >
            <span className="text-sm font-semibold tracking-tight text-[#F1F3F5]">
              Origin<sup className="ml-0.5 text-[10px] text-[#06B6D4]">®</sup>
            </span>
          </button>

          <span className="h-3.5 w-px bg-white/15" aria-hidden="true" />

          <div className="font-mono-telemetry flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[#8B94A5]">
            <span
              className={
                isSingularity
                  ? 'text-[#F59E0B]'
                  : isVoid
                    ? 'text-[#06B6D4]'
                    : 'text-[#F1F3F5]'
              }
            >
              {activeStage.code}
            </span>
            <span>//</span>
            <span className="text-[#F1F3F5]">{activeStage.title}</span>
          </div>
        </div>

        <div className="font-mono-telemetry flex flex-wrap items-center gap-2 text-[11px] tracking-[0.1em]">
          <div className="flex items-center border border-white/15 bg-[#090B10]/90">
            <span className="border-r border-white/12 px-2.5 py-1 text-[#8B94A5]">
              TIME
            </span>
            {TIME_SCALES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangeTimeScale(s)}
                className={`px-2.5 py-1 transition-colors ${
                  timeScale === s
                    ? 'bg-[#06B6D4] text-[#050608] font-medium'
                    : 'text-[#F1F3F5]/75 hover:text-[#F1F3F5]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleOrbits}
            className={`border px-3 py-1 transition-colors ${
              showOrbits
                ? 'border-[#06B6D4]/70 bg-[#090B10]/90 text-[#06B6D4]'
                : 'border-white/15 bg-[#090B10]/90 text-[#8B94A5] hover:text-[#F1F3F5]'
            }`}
          >
            ORBITS: {showOrbits ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      {/* Centered Reignite Trigger in Primordial Void */}
      {isVoid && (
        <div className="pointer-events-auto flex flex-col items-center justify-center self-center text-center">
          <p className="font-mono-telemetry mb-3 text-[11px] uppercase tracking-[0.24em] text-[#06B6D4]">
            ZERO-POINT VACUUM // 2.725 K
          </p>
          <button
            type="button"
            onClick={onReignite}
            className="font-mono-telemetry group flex items-center gap-2.5 border border-[#06B6D4]/80 bg-[#090B10]/95 px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-[#F1F3F5] transition-colors hover:bg-[#06B6D4] hover:text-[#050608]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>REIGNITE UNIVERSE</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Lower-Left Telemetry Plaque + Right-Edge Millimeter Scroll Ruler */}
      <div className="flex items-end justify-between gap-4">
        <aside className="pointer-events-auto w-full max-w-[390px] border border-white/14 bg-[#090B10]/90 p-4">
          <div className="font-mono-telemetry mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[#8B94A5]">
            <span>
              {activeStage.code} · {activeStage.subtitle}
            </span>
            <span className="text-[#06B6D4]">{String(pct).padStart(3, '0')}%</span>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-[#F1F3F5] sm:text-2xl">
            {activeStage.title}
          </h1>

          <p className="mt-1.5 text-xs leading-relaxed text-[#8B94A5]">
            {activeStage.description}
          </p>

          <dl className="font-mono-telemetry mt-3.5 grid grid-cols-4 gap-2 border-t border-white/12 pt-3 text-[10px]">
            <div>
              <dt className="text-[#8B94A5]">DIST</dt>
              <dd className="mt-0.5 text-[#F1F3F5]">{activeStage.distanceLabel}</dd>
            </div>
            <div>
              <dt className="text-[#8B94A5]">VEL</dt>
              <dd className="mt-0.5 text-[#F1F3F5]">{activeStage.velocityLabel}</dd>
            </div>
            <div>
              <dt className="text-[#8B94A5]">OBLQ</dt>
              <dd className="mt-0.5 text-[#F1F3F5]">{activeStage.tiltLabel}</dd>
            </div>
            <div>
              <dt className="text-[#8B94A5]">TEMP</dt>
              <dd className="mt-0.5 text-[#F1F3F5]">{activeStage.tempLabel}</dd>
            </div>
          </dl>
        </aside>

        {/* Right-Edge Millimeter Scroll Ruler (0%-100%) */}
        <nav
          aria-label="Cosmic depth scroll ruler"
          className="pointer-events-auto fixed right-4 top-20 bottom-6 hidden w-28 select-none sm:flex sm:items-stretch sm:justify-end"
        >
          <div
            ref={rulerRef}
            onPointerDown={handleRulerPointerDown}
            onPointerMove={handleRulerPointerMove}
            onPointerUp={handleRulerPointerUp}
            className="relative h-full w-full cursor-ns-resize"
          >
            {/* Vertical Spine Hairline */}
            <div className="absolute right-0 top-0 bottom-0 w-px bg-white/18" />

            {/* Minor Millimeter Hash Ticks */}
            {Array.from({ length: 41 }).map((_, idx) => {
              const p = idx / 40;
              const isMajor = idx % 4 === 0;
              return (
                <div
                  key={idx}
                  style={{ top: `${p * 100}%` }}
                  className={`absolute right-0 h-px bg-white/20 ${
                    isMajor ? 'w-3' : 'w-1.5'
                  }`}
                />
              );
            })}

            {/* Clickable Stage Ticks */}
            {NARRATIVE_STAGES.map((stage) => {
              const mid =
                stage.id === 'void'
                  ? 0.985
                  : (stage.scrollStart + stage.scrollEnd) * 0.5;
              const isActive = activeStage.id === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProgress(mid);
                  }}
                  style={{ top: `${mid * 100}%` }}
                  className="font-mono-telemetry group absolute right-0 flex -translate-y-1/2 items-center gap-2 pr-4 text-right text-[9px] tracking-[0.14em] focus:outline-none"
                >
                  <span
                    className={`transition-colors ${
                      isActive
                        ? 'font-semibold text-[#06B6D4]'
                        : 'text-[#8B94A5]/75 group-hover:text-[#F1F3F5]'
                    }`}
                  >
                    {stage.rulerLabel}
                  </span>
                  <span
                    className={`absolute right-0 h-px transition-all ${
                      isActive
                        ? 'w-5 bg-[#06B6D4]'
                        : 'w-2.5 bg-white/30 group-hover:w-4 group-hover:bg-white/70'
                    }`}
                  />
                </button>
              );
            })}

            {/* Live Progress Hairline Needle */}
            <div
              style={{ top: `${progress * 100}%` }}
              className="pointer-events-none absolute right-0 flex -translate-y-1/2 items-center"
            >
              <span className="font-mono-telemetry mr-1.5 bg-[#06B6D4] px-1 py-0.5 text-[9px] font-semibold text-[#050608]">
                {String(pct).padStart(2, '0')}%
              </span>
              <span className="h-[2px] w-6 bg-[#06B6D4]" />
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
