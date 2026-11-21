import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Briefcase,
  Check,
  Copy,
  Globe,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import {
  ALL_PROJECTS,
  CERTIFICATIONS,
  HONORS,
  INTERNSHIP,
  PORTFOLIO_CHAPTERS,
  PROFILE,
  SKILL_DOMAINS,
  SOCIAL_LINKS,
  type PortfolioProject,
  type ProjectDomain,
} from '../../data/portfolio';
import {
  CelestialEmblem,
  GitHubIcon,
  LeetCodeIcon,
  LinkedInIcon,
} from './CelestialIcons';

export type DrawerMode = 'closed' | 'chapter' | 'all-projects';

interface CodexFolioDrawerProps {
  mode: DrawerMode;
  chapterIndex: number;
  focusedProjectId?: string | null;
  onClose: () => void;
  onSwitchMode: (mode: 'chapter' | 'all-projects') => void;
  onSelectChapter: (index: number) => void;
}

function ProjectCard({
  project,
  index,
  showChapterTag = false,
  highlighted = false,
}: {
  project: PortfolioProject;
  index: number;
  showChapterTag?: boolean;
  highlighted?: boolean;
}) {
  const chapterMeta = PORTFOLIO_CHAPTERS[project.chapterIndex];

  return (
    <article
      id={`folio-project-${project.id}`}
      style={{ animationDelay: `${Math.min(index * 60, 320)}ms` }}
      className={`animate-folio-reveal group relative rounded-xl border p-4 transition-colors ${
        highlighted
          ? 'border-[#E8C47A]/85 bg-[#241C14]/92 ring-1 ring-[#E8C47A]/55'
          : 'border-[#DAB978]/22 bg-[#1A1612]/72 hover:border-[#E5C17B]/50 hover:bg-[#1E1914]/86'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono-metrics flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] tracking-[0.12em] text-[#E5C17B]/85 uppercase">
            <span>{project.year}</span>
            {showChapterTag && chapterMeta && (
              <>
                <span aria-hidden="true" className="text-[#DAB978]/40">
                  ·
                </span>
                <span className="text-[#9ED8EB]/90">
                  Ch. {chapterMeta.roman} — {project.domainLabel}
                </span>
              </>
            )}
          </div>
          <h4 className="font-display mt-1 text-[20px] leading-snug font-medium text-[#FAF6EE]">
            {project.title}
          </h4>
          <p className="font-body text-xs text-[#C8BEAE]/85">
            {project.subtitle}
          </p>
        </div>

        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${project.title} repository on GitHub`}
          title="View Repository on GitHub"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#DAB978]/26 bg-[#14110E]/85 text-[#EAE3D5]/85 transition-colors hover:border-[#E5C17B] hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5C17B]"
        >
          <GitHubIcon className="h-3.5 w-3.5" />
        </a>
      </div>

      {project.badge && (
        <div className="mt-2.5 flex items-center gap-1.5 border-y border-[#E5C17B]/22 py-1.5 text-[11px] font-medium text-[#E5C17B]">
          <Award className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{project.badge}</span>
        </div>
      )}

      <p className="font-body mt-2.5 text-[13px] leading-[1.6] text-[#EAE3D5]/88">
        {project.summary}
      </p>

      <ul className="mt-2.5 space-y-1.5 border-t border-[#EBE2D0]/10 pt-2.5">
        {project.highlights.map((item) => (
          <li
            key={item}
            className="font-body flex items-start gap-2 text-[12.5px] leading-[1.55] text-[#C8BEAE]/92"
          >
            <span
              aria-hidden="true"
              className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#E5C17B]"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EBE2D0]/10 pt-2.5">
        <span className="font-mono-metrics text-[11px] text-[#9ED8EB]">
          {project.metric}
        </span>
        <a
          href={project.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#E5C17B] transition-colors hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-[#E5C17B]"
        >
          <span>GitHub</span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <p className="font-mono-metrics mt-2 text-[10.5px] leading-relaxed text-[#C8BEAE]/75">
        {project.stack.join(' · ')}
      </p>
    </article>
  );
}

export function CodexFolioDrawer({
  mode,
  chapterIndex,
  focusedProjectId = null,
  onClose,
  onSwitchMode,
  onSelectChapter,
}: CodexFolioDrawerProps) {
  const isOpen = mode !== 'closed';
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);
  const [domainFilter, setDomainFilter] = useState<'all' | ProjectDomain>('all');
  const [activeSkillId, setActiveSkillId] = useState<string>('all');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const activeChapter = PORTFOLIO_CHAPTERS[chapterIndex] ?? PORTFOLIO_CHAPTERS[0];

  // Reset scroll or jump smoothly to focused project when switching phase/project
  useEffect(() => {
    if (!isOpen) return;
    if (focusedProjectId && mode === 'chapter') {
      const timer = window.setTimeout(() => {
        const el = document.getElementById(`folio-project-${focusedProjectId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
      return () => window.clearTimeout(timer);
    }
    if (scrollBodyRef.current) {
      scrollBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [chapterIndex, mode, focusedProjectId, isOpen]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      // Fallback copy via temporary input if clipboard API unavailable
      const input = document.createElement('input');
      input.value = PROFILE.email;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2200);
    }
  };

  const filteredProjects =
    domainFilter === 'all'
      ? ALL_PROJECTS
      : ALL_PROJECTS.filter((p) => p.domain === domainFilter);

  const chapterProjects = ALL_PROJECTS.filter(
    (p) => p.chapterIndex === chapterIndex,
  );

  const renderSocialIcon = (id: string) => {
    switch (id) {
      case 'github':
        return <GitHubIcon className="h-4 w-4" />;
      case 'linkedin':
        return <LinkedInIcon className="h-4 w-4" />;
      case 'leetcode':
        return <LeetCodeIcon className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" aria-hidden="true" />;
    }
  };

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[60] transition-opacity duration-400 ${
        isOpen
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0'
      }`}
    >
      {/* Subtle translucent backdrop scrim keeping 3D canvas visible on left */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-[#0B0908]/38 transition-opacity duration-400"
      />

      {/* Slide-Over Smoked Obsidian / Frosted Alabaster Glass Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === 'all-projects'
            ? 'All Engineered Projects'
            : `Phase ${activeChapter.roman} Folio — ${activeChapter.portfolioTitle}`
        }
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className={`parchment-grain absolute top-0 right-0 flex h-full w-[min(580px,92vw)] flex-col border-l border-[#DAB978]/28 bg-[#14110E]/88 shadow-[-24px_0_64px_rgba(0,0,0,0.65)] backdrop-blur-[22px] backdrop-saturate-[140%] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sticky Drawer Header */}
        <header className="shrink-0 border-b border-[#DAB978]/20 px-5 pt-4 pb-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSwitchMode('chapter')}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-[#E5C17B] ${
                  mode === 'chapter'
                    ? 'border border-[#E5C17B]/55 bg-[#E5C17B]/16 text-[#FAF6EE]'
                    : 'border border-transparent text-[#C8BEAE]/80 hover:text-[#FAF6EE]'
                }`}
              >
                Phase Folio
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode('all-projects')}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-[#E5C17B] ${
                  mode === 'all-projects'
                    ? 'border border-[#E5C17B]/55 bg-[#E5C17B]/16 text-[#FAF6EE]'
                    : 'border border-transparent text-[#C8BEAE]/80 hover:text-[#FAF6EE]'
                }`}
              >
                All Projects{' '}
                <span className="font-mono-metrics text-[#E5C17B]">(10)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Codex Folio drawer (Escape)"
              title="Close (Esc)"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#EBE2D0]/18 bg-[#1B1713]/85 px-2.5 text-xs text-[#EAE3D5]/85 transition-colors hover:border-[#E5C17B]/60 hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-[#E5C17B]"
            >
              <span className="font-mono-metrics hidden text-[10px] text-[#C8BEAE]/70 sm:inline">
                ESC
              </span>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Phase Index Switcher when viewing Phase Folio */}
          {mode === 'chapter' && (
            <nav
              aria-label="Phase Folio Index"
              className="mt-3 grid grid-cols-6 gap-1.5"
            >
              {PORTFOLIO_CHAPTERS.map((ch) => {
                const selected = ch.index === chapterIndex;
                return (
                  <button
                    key={ch.index}
                    type="button"
                    onClick={() => onSelectChapter(ch.index)}
                    aria-current={selected ? 'step' : undefined}
                    title={`Phase ${ch.roman} · ${ch.portfolioTitle}`}
                    className={`cursor-pointer rounded border px-1 py-1 text-center transition-all focus-visible:outline-2 focus-visible:outline-[#E5C17B] ${
                      selected
                        ? 'border-[#E5C17B]/70 bg-[#E5C17B]/18 text-[#FAF6EE]'
                        : 'border-[#DAB978]/14 bg-[#191511]/60 text-[#C8BEAE]/75 hover:border-[#DAB978]/40 hover:text-[#FAF6EE]'
                    }`}
                  >
                    <span className="font-display block text-sm font-medium">
                      {ch.roman}
                    </span>
                    <span className="font-body hidden truncate text-[9px] tracking-tight text-[#C8BEAE]/80 sm:block">
                      {ch.portfolioTitle.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        {/* Scrollable Folio Content */}
        <div
          ref={scrollBodyRef}
          className="folio-scroll flex-1 overflow-y-auto px-5 py-5 sm:px-6"
        >
          {mode === 'all-projects' ? (
            <div key="all-projects-view" className="space-y-4">
              <div className="animate-folio-reveal">
                <p className="font-mono-metrics text-[10.5px] tracking-[0.18em] text-[#E5C17B] uppercase">
                  Complete Engineering Archive
                </p>
                <h3 className="font-display mt-1 text-3xl font-medium tracking-wide text-[#FAF6EE]">
                  All Engineered Systems
                </h3>
                <p className="font-body mt-1.5 text-[13.5px] leading-[1.6] text-[#EAE3D5]/82">
                  Ten production-grade builds spanning autonomous multi-agent control planes, sub-second Voice-RAG, industrial SCADA forecasting, and 3D WebGL twins.
                </p>
              </div>

              {/* Interactive Domain Filters */}
              <div
                role="group"
                aria-label="Filter projects by domain"
                className="flex flex-wrap gap-1.5 border-y border-[#DAB978]/16 py-2.5"
              >
                {(
                  [
                    { id: 'all', label: 'All (10)' },
                    { id: 'agents', label: 'Agentic AI (3)' },
                    { id: 'voice', label: 'Voice & Tooling (4)' },
                    { id: 'industrial', label: 'Industrial & 3D (3)' },
                  ] as const
                ).map((filter) => {
                  const active = domainFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setDomainFilter(filter.id)}
                      className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#E5C17B] ${
                        active
                          ? 'border-[#E5C17B]/70 bg-[#E5C17B]/18 text-[#FAF6EE]'
                          : 'border-[#DAB978]/18 bg-[#191511]/65 text-[#C8BEAE] hover:border-[#DAB978]/45 hover:text-[#FAF6EE]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3.5">
                {filteredProjects.map((project, idx) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={idx}
                    showChapterTag
                  />
                ))}
              </div>
            </div>
          ) : (
            <div key={`chapter-${chapterIndex}`} className="space-y-5">
              {/* Chapter Curatorial Header */}
              <div className="animate-folio-reveal border-b border-[#DAB978]/18 pb-4">
                <div className="flex items-center gap-3">
                  <CelestialEmblem
                    chapterIndex={activeChapter.index}
                    className="h-10 w-10 shrink-0"
                  />
                  <div>
                    <p className="font-mono-metrics text-[10.5px] tracking-[0.18em] text-[#E5C17B] uppercase">
                      Phase {activeChapter.roman} · {activeChapter.artworkTitle}
                    </p>
                    <h3 className="font-display text-3xl leading-tight font-medium tracking-wide text-[#FAF6EE]">
                      {activeChapter.portfolioTitle}
                    </h3>
                  </div>
                </div>
                <p className="font-body mt-3 text-[13.5px] leading-[1.65] text-[#EAE3D5]/88">
                  {activeChapter.curatorialNote}
                </p>
              </div>

              {/* CHAPTER I: ORIGIN & IDENTITY */}
              {chapterIndex === 0 && (
                <div className="space-y-4">
                  <section className="animate-folio-reveal rounded-xl border border-[#DAB978]/22 bg-[#1A1612]/72 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-[#E5C17B] uppercase">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Engineering Focus</span>
                    </div>
                    <p className="font-body mt-2 text-[13.5px] leading-[1.65] text-[#FAF6EE]/92">
                      {PROFILE.objective}
                    </p>
                    <dl className="mt-3.5 grid grid-cols-3 divide-x divide-[#DAB978]/18 border-t border-[#DAB978]/16 pt-3">
                      {activeChapter.metrics.map((m) => (
                        <div key={m.label} className="px-2 first:pl-0 last:pr-0">
                          <dt className="font-mono-metrics text-sm font-medium text-[#E5C17B]">
                            {m.value}
                          </dt>
                          <dd className="font-body mt-0.5 text-[11px] text-[#C8BEAE]">
                            {m.label}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section
                    style={{ animationDelay: '70ms' }}
                    className="animate-folio-reveal rounded-xl border border-[#DAB978]/22 bg-[#1A1612]/72 p-4"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-[#E5C17B] uppercase">
                      <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Academic Foundation</span>
                    </div>
                    <h4 className="font-display mt-2 text-xl font-medium text-[#FAF6EE]">
                      {PROFILE.education.degree}
                    </h4>
                    <p className="font-body mt-0.5 text-[13px] text-[#EAE3D5]/85">
                      {PROFILE.education.institution}
                    </p>
                    <div className="font-mono-metrics mt-2.5 flex items-center gap-4 text-xs text-[#9ED8EB]">
                      <span>{PROFILE.education.period}</span>
                      <span aria-hidden="true" className="text-[#DAB978]/40">
                        ·
                      </span>
                      <span>CGPA {PROFILE.education.cgpa}</span>
                    </div>
                  </section>

                  <section
                    style={{ animationDelay: '130ms' }}
                    className="animate-folio-reveal rounded-xl border border-[#DAB978]/22 bg-[#1A1612]/72 p-4"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-[#E5C17B] uppercase">
                      <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Daily Agentic Workflow</span>
                    </div>
                    <p className="font-body mt-2 text-[13px] leading-[1.6] text-[#EAE3D5]/86">
                      Active daily engineering loop combining autonomous terminal harnesses, deterministic evals, and local inference checks:
                    </p>
                    <p className="font-mono-metrics mt-2.5 text-xs font-medium text-[#E5C17B]">
                      {PROFILE.workflow.join(' · ')}
                    </p>
                  </section>

                  {/* Quick Contact & Links */}
                  <section
                    style={{ animationDelay: '180ms' }}
                    className="animate-folio-reveal rounded-xl border border-[#DAB978]/22 bg-[#1A1612]/72 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-mono-metrics text-[10.5px] tracking-[0.14em] text-[#C8BEAE] uppercase">
                          Direct Reach
                        </p>
                        <p className="font-mono-metrics mt-0.5 text-xs text-[#FAF6EE]">
                          {PROFILE.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#E5C17B]/45 bg-[#E5C17B]/12 px-2.5 py-1.5 text-xs font-medium text-[#FAF6EE] transition-colors hover:border-[#E5C17B] hover:bg-[#E5C17B]/22 focus-visible:outline-2 focus-visible:outline-[#E5C17B]"
                      >
                        {copiedEmail ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-[#9ED8EB]" aria-hidden="true" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-[#E5C17B]" aria-hidden="true" />
                            <span>Copy Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* CHAPTER II & CHAPTER III: PROJECT SHOWCASES */}
              {(chapterIndex === 1 || chapterIndex === 2) && (
                <div className="space-y-3.5">
                  {chapterProjects.map((project, idx) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={idx}
                      highlighted={focusedProjectId === project.id}
                    />
                  ))}
                </div>
              )}

              {/* CHAPTER IV: INDUSTRIAL AI, 3D TWINS & INTERNSHIP */}
              {chapterIndex === 3 && (
                <div className="space-y-4">
                  <div className="space-y-3.5">
                    {chapterProjects.map((project, idx) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        index={idx}
                        highlighted={focusedProjectId === project.id}
                      />
                    ))}
                  </div>

                  {/* Internship Card */}
                  <section
                    style={{ animationDelay: '220ms' }}
                    className="animate-folio-reveal rounded-xl border border-[#9ED8EB]/30 bg-[#17191B]/72 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.12em] text-[#9ED8EB] uppercase">
                        <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Internship</span>
                      </span>
                      <span className="font-mono-metrics text-[10.5px] text-[#C8BEAE]">
                        {INTERNSHIP.period}
                      </span>
                    </div>
                    <h4 className="font-display mt-1.5 text-xl font-medium text-[#FAF6EE]">
                      {INTERNSHIP.role}
                    </h4>
                    <p className="font-body text-xs text-[#E5C17B]">
                      {INTERNSHIP.organization} · {INTERNSHIP.location}
                    </p>
                    <p className="font-body mt-2 text-[13px] leading-[1.6] text-[#EAE3D5]/88">
                      {INTERNSHIP.summary}
                    </p>
                    <ul className="mt-2.5 space-y-1.5 border-t border-[#EBE2D0]/10 pt-2.5">
                      {INTERNSHIP.highlights.map((item) => (
                        <li
                          key={item}
                          className="font-body flex items-start gap-2 text-[12.5px] leading-[1.55] text-[#C8BEAE]/92"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#9ED8EB]"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="font-mono-metrics mt-2.5 text-[10.5px] text-[#C8BEAE]/75">
                      {INTERNSHIP.stack.join(' · ')}
                    </p>
                  </section>
                </div>
              )}

              {/* CHAPTER V: ENGINEERING STACK & CERTIFICATIONS */}
              {chapterIndex === 4 && (
                <div className="space-y-4">
                  {/* Interactive Stack Domain Selector */}
                  <div
                    role="group"
                    aria-label="Filter skill categories"
                    className="flex flex-wrap gap-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveSkillId('all')}
                      className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#E5C17B] ${
                        activeSkillId === 'all'
                          ? 'border-[#E5C17B]/70 bg-[#E5C17B]/18 text-[#FAF6EE]'
                          : 'border-[#DAB978]/18 bg-[#191511]/65 text-[#C8BEAE] hover:text-[#FAF6EE]'
                      }`}
                    >
                      All Domains (5)
                    </button>
                    {SKILL_DOMAINS.map((domain) => (
                      <button
                        key={domain.id}
                        type="button"
                        onClick={() => setActiveSkillId(domain.id)}
                        className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#E5C17B] ${
                          activeSkillId === domain.id
                            ? 'border-[#E5C17B]/70 bg-[#E5C17B]/18 text-[#FAF6EE]'
                            : 'border-[#DAB978]/18 bg-[#191511]/65 text-[#C8BEAE] hover:text-[#FAF6EE]'
                        }`}
                      >
                        {domain.title.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {SKILL_DOMAINS.filter(
                      (d) => activeSkillId === 'all' || d.id === activeSkillId,
                    ).map((domain, idx) => (
                      <section
                        key={domain.id}
                        style={{ animationDelay: `${idx * 55}ms` }}
                        className="animate-folio-reveal rounded-xl border border-[#DAB978]/22 bg-[#1A1612]/72 p-4"
                      >
                        <div className="flex items-center gap-2">
                          <Layers
                            className="h-3.5 w-3.5 text-[#E5C17B]"
                            aria-hidden="true"
                          />
                          <h4 className="font-display text-lg font-medium text-[#FAF6EE]">
                            {domain.title}
                          </h4>
                        </div>
                        <p className="font-body mt-0.5 text-xs text-[#C8BEAE]/80">
                          {domain.subtitle}
                        </p>
                        <p className="font-mono-metrics mt-2.5 text-xs leading-[1.75] text-[#EAE3D5]/92">
                          {domain.items.join(' · ')}
                        </p>
                      </section>
                    ))}
                  </div>

                  {/* Certifications Ledger */}
                  <section className="animate-folio-reveal rounded-xl border border-[#DAB978]/22 bg-[#1A1612]/72 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-[#E5C17B] uppercase">
                      <Award className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Verified Certifications (6)</span>
                    </div>
                    <ul className="mt-3 divide-y divide-[#EBE2D0]/10">
                      {CERTIFICATIONS.map((cert) => (
                        <li
                          key={cert.title}
                          className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                        >
                          <div>
                            <p className="font-body text-[13px] font-medium text-[#FAF6EE]">
                              {cert.title}
                            </p>
                            <p className="font-body text-xs text-[#C8BEAE]/80">
                              {cert.issuer}
                            </p>
                          </div>
                          <span className="font-mono-metrics shrink-0 text-[11px] text-[#9ED8EB]">
                            {cert.year}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              )}

              {/* CHAPTER VI: HONORS & CONNECT */}
              {chapterIndex === 5 && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {HONORS.map((honor, idx) => (
                      <article
                        key={honor.id}
                        style={{ animationDelay: `${idx * 60}ms` }}
                        className="animate-folio-reveal rounded-xl border border-[#DAB978]/22 bg-[#1A1612]/72 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-metrics text-[10.5px] tracking-[0.12em] text-[#E5C17B] uppercase">
                            {honor.highlight}
                          </span>
                          <span className="font-mono-metrics text-[10.5px] text-[#C8BEAE]/80">
                            {honor.date}
                          </span>
                        </div>
                        <h4 className="font-display mt-1 text-xl font-medium text-[#FAF6EE]">
                          {honor.title}
                        </h4>
                        <p className="font-body text-xs text-[#9ED8EB]/90">
                          {honor.organization}
                        </p>
                        <p className="font-body mt-2 text-[13px] leading-[1.6] text-[#EAE3D5]/88">
                          {honor.detail}
                        </p>
                      </article>
                    ))}
                  </div>

                  {/* Interactive Contact & Social Card */}
                  <section
                    style={{ animationDelay: '240ms' }}
                    className="animate-folio-reveal rounded-xl border border-[#E5C17B]/40 bg-[#1B1611]/85 p-4"
                  >
                    <p className="font-mono-metrics text-[10.5px] tracking-[0.16em] text-[#E5C17B] uppercase">
                      Open for Offers &amp; Freelance Projects
                    </p>
                    <h4 className="font-display mt-1 text-2xl font-medium text-[#FAF6EE]">
                      {PROFILE.name}
                    </h4>

                    <div className="mt-3 space-y-2.5 border-y border-[#DAB978]/18 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <a
                          href={`mailto:${PROFILE.email}`}
                          className="inline-flex items-center gap-2 text-[13px] text-[#FAF6EE] transition-colors hover:text-[#E5C17B]"
                        >
                          <Mail
                            className="h-4 w-4 text-[#E5C17B]"
                            aria-hidden="true"
                          />
                          <span className="font-mono-metrics text-xs">
                            {PROFILE.email}
                          </span>
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyEmail}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#E5C17B]/50 bg-[#E5C17B]/14 px-2.5 py-1 text-xs font-medium text-[#FAF6EE] transition-colors hover:border-[#E5C17B] hover:bg-[#E5C17B]/24 focus-visible:outline-2 focus-visible:outline-[#E5C17B]"
                        >
                          {copiedEmail ? (
                            <>
                              <Check
                                className="h-3.5 w-3.5 text-[#9ED8EB]"
                                aria-hidden="true"
                              />
                              <span>Email Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy
                                className="h-3.5 w-3.5 text-[#E5C17B]"
                                aria-hidden="true"
                              />
                              <span>Copy Email</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#C8BEAE]">
                        <a
                          href={`tel:${PROFILE.phone.replace(/\s+/g, '')}`}
                          className="font-mono-metrics inline-flex items-center gap-1.5 transition-colors hover:text-[#FAF6EE]"
                        >
                          <Phone
                            className="h-3.5 w-3.5 text-[#E5C17B]"
                            aria-hidden="true"
                          />
                          <span>{PROFILE.phone}</span>
                        </a>
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin
                            className="h-3.5 w-3.5 text-[#9ED8EB]"
                            aria-hidden="true"
                          />
                          <span>{PROFILE.location}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {SOCIAL_LINKS.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 rounded-lg border border-[#DAB978]/20 bg-[#14110E]/75 px-3 py-2 text-xs text-[#EAE3D5] transition-colors hover:border-[#E5C17B]/55 hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-[#E5C17B]"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className="text-[#E5C17B]">
                              {renderSocialIcon(link.id)}
                            </span>
                            <span className="truncate font-medium">
                              {link.label}
                            </span>
                          </span>
                          <ArrowUpRight
                            className="h-3.5 w-3.5 shrink-0 text-[#C8BEAE]/75"
                            aria-hidden="true"
                          />
                        </a>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Drawer Footer */}
        <footer className="shrink-0 border-t border-[#DAB978]/20 px-5 py-3 sm:px-6">
          {mode === 'all-projects' ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSwitchMode('chapter')}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#E5C17B] transition-colors hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-[#E5C17B]"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Return to Phase {activeChapter.roman}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-md border border-[#EBE2D0]/20 px-3 py-1 text-xs text-[#EAE3D5] transition-colors hover:border-[#E5C17B]/60 hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-[#E5C17B]"
              >
                Close Folio
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={chapterIndex === 0}
                onClick={() => onSelectChapter(Math.max(0, chapterIndex - 1))}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#DAB978]/22 px-3 py-1.5 text-xs text-[#EAE3D5] transition-colors hover:border-[#E5C17B]/60 hover:text-[#FAF6EE] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-[#E5C17B]"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Previous Phase</span>
              </button>

              <span className="font-mono-metrics text-[11px] text-[#C8BEAE]/80">
                Phase {activeChapter.roman} · {chapterIndex + 1} /{' '}
                {PORTFOLIO_CHAPTERS.length}
              </span>

              <button
                type="button"
                disabled={chapterIndex === PORTFOLIO_CHAPTERS.length - 1}
                onClick={() =>
                  onSelectChapter(
                    Math.min(PORTFOLIO_CHAPTERS.length - 1, chapterIndex + 1),
                  )
                }
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#DAB978]/22 px-3 py-1.5 text-xs text-[#EAE3D5] transition-colors hover:border-[#E5C17B]/60 hover:text-[#FAF6EE] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-[#E5C17B]"
              >
                <span>Next Phase</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}
