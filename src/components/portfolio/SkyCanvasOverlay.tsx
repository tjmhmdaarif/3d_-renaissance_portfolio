import { ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';
import {
  PORTFOLIO_CHAPTERS,
  PROFILE,
  SOCIAL_LINKS,
} from '../../data/portfolio';

interface SkyCanvasOverlayProps {
  progress: number;
  pureArtMode: boolean;
  isModalOrDrawerOpen: boolean;
  onInspectChapter: (index: number, projectId?: string) => void;
  onOpenContact: () => void;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / Math.max(1e-5, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

const PHASE_HEADLINES = [
  <>
    <span className="swash-initial">I</span>dentity &amp;{' '}
    <span className="swash-initial">E</span>ducation
  </>,
  <>
    <span className="swash-initial">A</span>utonomous{' '}
    <span className="swash-initial">A</span>gent{' '}
    <span className="swash-initial">S</span>ystems
  </>,
  <>
    <span className="swash-initial">R</span>eal-Time{' '}
    <span className="swash-initial">V</span>oice &amp;{' '}
    <span className="swash-initial">T</span>ooling
  </>,
  <>
    <span className="swash-initial">I</span>ndustrial{' '}
    <span className="swash-initial">A</span>I &amp;{' '}
    <span className="swash-initial">3D</span>{' '}
    <span className="swash-initial">T</span>wins
  </>,
  <>
    <span className="swash-initial">E</span>ngineering{' '}
    <span className="swash-initial">S</span>tack &amp;{' '}
    <span className="swash-initial">C</span>redentials
  </>,
  <>
    <span className="swash-initial">H</span>onors &amp;{' '}
    <span className="swash-initial">C</span>onnect
  </>,
];

export function SkyCanvasOverlay({
  progress,
  pureArtMode,
  isModalOrDrawerOpen,
  onInspectChapter,
  onOpenContact,
}: SkyCanvasOverlayProps) {
  const hidden = pureArtMode || isModalOrDrawerOpen;
  const count = PORTFOLIO_CHAPTERS.length;
  const clamped = clamp01(progress);
  const scaled = clamped * count;
  const activeIdx = Math.min(count - 1, Math.floor(scaled));
  const localU = clamp01(scaled - activeIdx);
  const activeChapter = PORTFOLIO_CHAPTERS[activeIdx] ?? PORTFOLIO_CHAPTERS[0];

  const enterFade = activeIdx === 0 ? 1 : smoothstep(0.0, 0.14, localU);
  const exitFade =
    activeIdx === count - 1 ? 1 : 1 - smoothstep(0.84, 0.99, localU);
  const chapterAlpha = hidden ? 0 : enterFade * exitFade;

  // Strictly non-negative downward scroll-parallax offsets so no card can ever rise above top: 108px
  const anchorDriftY = Math.max(0, localU * 10);
  const rightDriftY = Math.max(0, localU * 16);

  // Peak 3D focal-moment dissolves for the right-side margin stack:
  // Ch. V diagonal golden spear crossing & Ch. VI fingertip Light Prism contact
  const ch5SpearCrossFade =
    activeIdx === 4 ? 1 - smoothstep(0.42, 0.82, localU) * 0.92 : 1;
  const ch6PrismCrossFade =
    activeIdx === 5 ? 1 - smoothstep(0.5, 0.84, localU) * 0.92 : 1;
  const rightStackFade =
    chapterAlpha *
    (activeIdx === 4
      ? ch5SpearCrossFade
      : activeIdx === 5
        ? ch6PrismCrossFade
        : 1);

  return (
    <>
      {/* HARD VIEWPORT SAFE-ZONE CONTAINER: top 108px -> bottom 92px across ALL 6 chapters */}
      <div
        aria-hidden={hidden}
        className={`pointer-events-none fixed top-[108px] right-[28px] bottom-[92px] left-[28px] z-20 overflow-hidden transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          hidden ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* UNIFIED UPPER-LEFT EDITORIAL ANCHOR FOR ALL 6 PHASES */}
        <section
          key={`anchor-${activeIdx}`}
          style={{
            opacity: chapterAlpha,
            transform: `translate3d(0, ${anchorDriftY.toFixed(1)}px, 0)`,
          }}
          className={`animate-folio-reveal pointer-events-auto absolute top-0 left-0 max-w-[440px] ${
            activeIdx === 0 ? 'pt-7 sm:pt-9' : ''
          }`}
        >
          <p className="font-mono-metrics sky-text-shadow text-[10px] tracking-[0.22em] text-[#E8C47A] uppercase">
            Chapter {activeChapter.roman} · {activeChapter.portfolioTitle}
          </p>
          <h2 className="font-display sky-text-shadow mt-0.5 text-3xl leading-[1.04] font-medium tracking-[0.02em] text-[#FAF6EE] sm:text-[40px]">
            {PHASE_HEADLINES[activeIdx]}
          </h2>
          <p className="font-body sky-text-shadow mt-1.5 max-w-[390px] text-xs leading-relaxed text-[#FAF6EE]/90 sm:text-[13px]">
            {activeChapter.thesis}
          </p>

          <button
            type="button"
            onClick={() => onInspectChapter(activeIdx)}
            tabIndex={hidden ? -1 : 0}
            className="group mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E8C47A]/65 bg-[#14110E]/78 px-4 py-1.5 text-xs font-medium tracking-wide text-[#FAF6EE] shadow-[0_8px_24px_rgba(10,8,6,0.42)] transition-all hover:border-[#E8C47A] hover:bg-[#1E1812]/92 hover:text-[#E8C47A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8C47A]"
          >
            <span>Open Phase {activeChapter.roman} Folio</span>
            <ArrowRight
              className="h-3.5 w-3.5 text-[#E8C47A] transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </section>

        {/* CLEAN RIGHT-SIDE MARGIN STACK (strictly inside top 108px to bottom 150px) */}
        <aside
          key={`right-stack-${activeIdx}`}
          style={{
            opacity: rightStackFade,
            transform: `translate3d(0, ${rightDriftY.toFixed(1)}px, 0)`,
            pointerEvents: rightStackFade < 0.12 ? 'none' : undefined,
          }}
          className="animate-folio-reveal pointer-events-auto absolute top-[8px] right-0 bottom-[58px] hidden w-[min(340px,28vw)] flex-col gap-[14px] overflow-hidden md:flex"
        >
          {/* PHASE I: Origin Metrics + Academic & Workflow Preview */}
          {activeIdx === 0 && (
            <>
              <article className="sky-glass-card rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono-metrics text-[10px] tracking-[0.16em] text-[#9ED8EB] uppercase">
                    Verified Output
                  </p>
                  <button
                    type="button"
                    onClick={() => onInspectChapter(0)}
                    tabIndex={hidden ? -1 : 0}
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                  >
                    <span>Inspect in Folio</span>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
                <dl className="mt-2.5 grid grid-cols-3 divide-x divide-[#E8C47A]/22">
                  {activeChapter.metrics.map((m) => (
                    <div key={m.label} className="px-2 first:pl-0 last:pr-0">
                      <dt className="font-mono-metrics text-sm font-medium text-[#E8C47A]">
                        {m.value}
                      </dt>
                      <dd className="font-body text-[10.5px] text-[#FAF6EE]/82">
                        {m.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>

              <article className="sky-glass-card rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    B.E. ECE · 2023–2027
                  </h3>
                  <span className="font-mono-metrics text-[11px] text-[#E8C47A]">
                    CGPA {PROFILE.education.cgpa}
                  </span>
                </div>
                <p className="font-body mt-0.5 text-xs text-[#FAF6EE]/84">
                  {PROFILE.education.institution}
                </p>
                <p className="font-mono-metrics mt-2 border-t border-[#E8C47A]/18 pt-2 text-[10.5px] text-[#FAF6EE]/80">
                  {PROFILE.workflow.join(' · ')}
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(0)}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-2 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>
            </>
          )}

          {/* PHASE II: Autonomous Agent Systems */}
          {activeIdx === 1 && (
            <>
              <article className="sky-glass-card rounded-xl p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    AgentOps 2.0
                  </h3>
                  <span className="font-mono-metrics text-[10.5px] text-[#E8C47A]">
                    ~60x Faster
                  </span>
                </div>
                <p className="font-body mt-1 text-xs leading-snug text-[#FAF6EE]/86">
                  6-state autonomous IoT anomaly triage loop validated across{' '}
                  <span className="font-mono-metrics text-[#9ED8EB]">58 pytest</span>{' '}
                  suites.
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(1, 'agentops-2')}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>

              <article className="sky-glass-card rounded-xl p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    WhatIf
                  </h3>
                  <span className="font-mono-metrics text-[10.5px] text-[#9ED8EB]">
                    404 Offline Tests
                  </span>
                </div>
                <p className="font-body mt-1 text-xs leading-snug text-[#FAF6EE]/86">
                  Local-first <strong className="font-medium text-[#FAF6EE]">Ollama</strong> RAG decision assistant with hybrid vector + BM25 citations.
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(1, 'whatif')}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>

              <article className="sky-glass-card rounded-xl p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    Aftermath Decision Platform
                  </h3>
                </div>
                <p className="font-body mt-1 text-xs leading-snug text-[#FAF6EE]/84">
                  Auditable post-incident action graphs &amp; deterministic triage.
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(1, 'aftermath')}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>
            </>
          )}

          {/* PHASE III: Real-Time Voice & Dev Tooling */}
          {activeIdx === 2 && (
            <>
              <article className="sky-glass-card rounded-xl p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    Voice-RAG Pipeline
                  </h3>
                  <span className="font-mono-metrics text-[10.5px] text-[#E8C47A]">
                    ~250ms
                  </span>
                </div>
                <p className="font-body mt-0.5 text-xs leading-snug text-[#FAF6EE]/86">
                  Latency cut from &gt;3s to ~250ms via Sarvam AI &amp; ElevenLabs.
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(2, 'voice-rag')}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>

              <article className="sky-glass-card rounded-xl p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    FlowMini
                  </h3>
                  <span className="font-mono-metrics text-[10.5px] text-[#9ED8EB]">
                    150 Checks
                  </span>
                </div>
                <p className="font-body mt-0.5 text-xs leading-snug text-[#FAF6EE]/84">
                  Local Faster-Whisper Windows dictation with zero cloud calls.
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(2, 'flowmini')}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>

              <article className="sky-glass-card rounded-xl p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    GitAuto
                  </h3>
                  <span className="font-mono-metrics text-[10.5px] text-[#E8C47A]">
                    NVIDIA NIM
                  </span>
                </div>
                <p className="font-body mt-0.5 text-xs leading-snug text-[#FAF6EE]/84">
                  AI repository &amp; skill scout with AST codebase audits.
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(2, 'gitauto')}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>

              <article className="sky-glass-card hidden rounded-xl p-2.5 lg:block">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    Zabalance
                  </h3>
                  <span className="font-mono-metrics text-[10.5px] text-[#9ED8EB]">
                    FinOps
                  </span>
                </div>
                <p className="font-body mt-0.5 text-xs leading-snug text-[#FAF6EE]/84">
                  Multi-provider LLM credit tracker &amp; token burn telemetry.
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(2, 'zabalance')}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>
            </>
          )}

          {/* PHASE IV: Industrial AI, 3D Twins & Embedded */}
          {activeIdx === 3 && (
            <>
              <article className="sky-glass-card rounded-xl p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    WindSense AI
                  </h3>
                  <span className="font-mono-metrics text-[10.5px] text-[#E8C47A]">
                    15,517 Episodes
                  </span>
                </div>
                <p className="font-body mt-0.5 text-xs leading-snug text-[#FAF6EE]/86">
                  Wind SCADA alarm intelligence ·{' '}
                  <strong className="font-medium text-[#E8C47A]">
                    TECHgium Finalist (LTTS)
                  </strong>
                  .
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(3, 'windsense-ai')}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>

              <article className="sky-glass-card rounded-xl p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    InfraGuard 2.0
                  </h3>
                  <span className="font-mono-metrics text-[10.5px] text-[#9ED8EB]">
                    Three.js / R3F
                  </span>
                </div>
                <p className="font-body mt-0.5 text-xs leading-snug text-[#FAF6EE]/84">
                  3D bridge structural digital twin with live sensor telemetry.
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(3, 'infraguard-2')}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>

              <article className="sky-glass-card rounded-xl p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium text-[#FAF6EE]">
                    Parkinson&apos;s &amp; ESP32
                  </h3>
                  <span className="font-mono-metrics text-[10.5px] text-[#9ED8EB]">
                    &lt;150ms Edge
                  </span>
                </div>
                <p className="font-body mt-0.5 text-xs leading-snug text-[#FAF6EE]/84">
                  Non-invasive bio-signal ML &amp; Hi Tech Solutions embedded training.
                </p>
                <button
                  type="button"
                  onClick={() => onInspectChapter(3, 'parkinsons-esp32')}
                  tabIndex={hidden ? -1 : 0}
                  className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                >
                  <span>Inspect in Folio</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </button>
              </article>
            </>
          )}

          {/* PHASE V: Engineering Stack & Credentials (dissolves cleanly during diagonal spear crossing) */}
          {activeIdx === 4 && (
            <>
              <article className="sky-glass-card rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono-metrics text-[10px] tracking-[0.16em] text-[#E8C47A] uppercase">
                    Core Engineering Stack
                  </p>
                  <button
                    type="button"
                    onClick={() => onInspectChapter(4)}
                    tabIndex={hidden ? -1 : 0}
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                  >
                    <span>Inspect in Folio</span>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
                <dl className="mt-2 divide-y divide-[#E8C47A]/18 text-xs">
                  <div className="flex justify-between gap-3 py-1.5 first:pt-0">
                    <dt className="text-[#C8BEAE]">Backend</dt>
                    <dd className="font-mono-metrics text-right text-[#FAF6EE]">
                      Python · TypeScript · FastAPI
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-1.5">
                    <dt className="text-[#C8BEAE]">AI Agents</dt>
                    <dd className="font-mono-metrics text-right text-[#FAF6EE]">
                      LLMs/RAG · LangGraph · Ollama
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-1.5 last:pb-0">
                    <dt className="text-[#C8BEAE]">Inference</dt>
                    <dd className="font-mono-metrics text-right text-[#FAF6EE]">
                      NVIDIA NIM · Whisper · Sarvam
                    </dd>
                  </div>
                </dl>
              </article>

              <article className="sky-glass-card rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono-metrics text-[10px] tracking-[0.16em] text-[#9ED8EB] uppercase">
                    Spatial, Cloud &amp; Credentials
                  </p>
                  <button
                    type="button"
                    onClick={() => onInspectChapter(4)}
                    tabIndex={hidden ? -1 : 0}
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                  >
                    <span>Inspect in Folio</span>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
                <dl className="mt-2 divide-y divide-[#E8C47A]/18 text-xs">
                  <div className="flex justify-between gap-3 py-1.5 first:pt-0">
                    <dt className="text-[#C8BEAE]">Frontend / 3D</dt>
                    <dd className="font-mono-metrics text-right text-[#FAF6EE]">
                      React · Three.js · R3F
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-1.5">
                    <dt className="text-[#C8BEAE]">Infra / Edge</dt>
                    <dd className="font-mono-metrics text-right text-[#FAF6EE]">
                      Docker · Azure · ESP32/RTOS
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 py-1.5 last:pb-0">
                    <dt className="text-[#C8BEAE]">Credentials</dt>
                    <dd className="font-mono-metrics text-right text-[#E8C47A]">
                      6 Verified Certifications
                    </dd>
                  </div>
                </dl>
              </article>
            </>
          )}

          {/* PHASE VI: Honors & Recognition (dissolves cleanly during fingertip Light Prism contact) */}
          {activeIdx === 5 && (
            <>
              <article className="sky-glass-card rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-metrics text-[10px] tracking-[0.14em] text-[#E8C47A] uppercase">
                    National Honors
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspectChapter(5)}
                    tabIndex={hidden ? -1 : 0}
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                  >
                    <span>Inspect in Folio</span>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
                <h3 className="font-display mt-1 text-lg font-medium text-[#FAF6EE]">
                  TECHgium 9th Ed. Finalist
                </h3>
                <p className="font-body mt-0.5 text-xs text-[#FAF6EE]/84">
                  L&amp;T Technology Services · Ecotronics Runner-Up (₹30,000 Prize)
                </p>
              </article>

              <article className="sky-glass-card rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-metrics text-[10px] tracking-[0.14em] text-[#9ED8EB] uppercase">
                    Leadership &amp; Craft
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspectChapter(5)}
                    tabIndex={hidden ? -1 : 0}
                    className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8C47A] transition-colors hover:text-[#FAF6EE]"
                  >
                    <span>Inspect in Folio</span>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
                <h3 className="font-display mt-1 text-lg font-medium text-[#FAF6EE]">
                  Yi Yuva Student Chair
                </h3>
                <p className="font-body mt-0.5 text-xs text-[#FAF6EE]/84">
                  Skill on Wheels 2.0 · 120-Day Python DSA &amp; Daily LeetCode
                </p>
              </article>
            </>
          )}
        </aside>

        {/* PHASE VI LOWER-LEFT FINALE: Honors Strip + Parenthetical Email + Obsidian Pills */}
        {activeIdx === 5 && (
          <div
            key="ch6-finale-strip"
            style={{ opacity: chapterAlpha }}
            className="animate-folio-reveal pointer-events-auto absolute bottom-0 left-0 max-w-[min(560px,100%)]"
          >
            <p className="font-body sky-text-shadow text-[11.5px] leading-relaxed text-[#FAF6EE]/92 sm:text-xs">
              <span className="font-medium text-[#E8C47A]">
                TECHgium Finalist
              </span>
              {' · '}
              <span>Ecotronics Runner-Up ₹30,000</span>
              {' · '}
              <span>120-Day Python DSA</span>
              {' · '}
              <span>Yi Yuva Student Chair</span>
            </p>

            <div className="mt-1.5">
              <button
                type="button"
                onClick={onOpenContact}
                tabIndex={hidden ? -1 : 0}
                className="font-mono-metrics sky-text-shadow cursor-pointer text-sm font-semibold tracking-wide text-[#FAF6EE] transition-colors hover:text-[#E8C47A] focus-visible:outline-2 focus-visible:outline-[#E8C47A] sm:text-[15px]"
              >
                ( {PROFILE.email} )
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={hidden ? -1 : 0}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E8C47A]/45 bg-[#12100E]/92 px-3 py-1 font-mono-metrics text-[10px] font-medium tracking-[0.12em] text-[#FAF6EE] uppercase shadow-lg transition-all hover:border-[#E8C47A] hover:bg-[#1E1914] hover:text-[#E8C47A] focus-visible:outline-2 focus-visible:outline-[#E8C47A]"
                >
                  <span>{link.label}</span>
                  <span aria-hidden="true" className="text-[9px] text-[#E8C47A]">
                    ●
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM-ANCHORED "CONTACT NOW ✦" PILL BUTTON (cleanly clear of top header & right ControlDock) */}
      <div
        aria-hidden={hidden}
        className={`pointer-events-none fixed bottom-[88px] left-4 z-40 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:bottom-5 md:left-7 ${
          hidden
            ? 'translate-y-4 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={onOpenContact}
          tabIndex={hidden ? -1 : 0}
          className={`group inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.14em] text-[#FAF6EE] uppercase transition-all hover:scale-[1.03] hover:border-[#FAF6EE] hover:bg-[#1E1812] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8C47A] ${
            hidden ? 'pointer-events-none' : 'pointer-events-auto'
          } ${
            activeIdx === 5
              ? 'border-[#E8C47A]/90 bg-[#14110E]/92 shadow-[0_0_28px_rgba(232,196,122,0.52)]'
              : 'border-[#E8C47A]/65 bg-[#14110E]/86 shadow-[0_10px_28px_rgba(0,0,0,0.48)]'
          }`}
        >
          <Sparkles
            className="h-3.5 w-3.5 text-[#E8C47A] transition-transform duration-300 group-hover:rotate-45"
            aria-hidden="true"
          />
          <span>CONTACT NOW ✦</span>
        </button>
      </div>
    </>
  );
}
