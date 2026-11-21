import { Eye, EyeOff, FolderKanban, Globe, Pause, Play } from 'lucide-react';
import { PROFILE, SOCIAL_LINKS } from '../../data/portfolio';
import { GitHubIcon, LeetCodeIcon, LinkedInIcon } from './CelestialIcons';

interface TopNavProps {
  pureArtMode: boolean;
  isDrawerOpen: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenAllProjects: () => void;
  onTogglePureArt: () => void;
}

export function TopNav({
  pureArtMode,
  isDrawerOpen,
  isPlaying,
  onTogglePlay,
  onOpenAllProjects,
  onTogglePureArt,
}: TopNavProps) {
  const renderSocialIcon = (id: string) => {
    switch (id) {
      case 'github':
        return <GitHubIcon className="h-3.5 w-3.5" />;
      case 'linkedin':
        return <LinkedInIcon className="h-3.5 w-3.5" />;
      case 'leetcode':
        return <LeetCodeIcon className="h-3.5 w-3.5" />;
      default:
        return <Globe className="h-3.5 w-3.5" aria-hidden="true" />;
    }
  };

  return (
    <>
      <header
        aria-hidden={pureArtMode}
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 flex h-[76px] items-center justify-between bg-gradient-to-b from-[#12100E]/86 via-[#12100E]/42 to-transparent px-4 sm:px-7 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          pureArtMode
            ? '-translate-y-2 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Brand Identity */}
        <div className="pointer-events-auto flex min-w-0 items-baseline gap-2.5">
          <span className="font-display truncate text-base font-medium tracking-[0.12em] text-[#FAF6EE] drop-shadow-[0_1px_10px_rgba(229,193,123,0.18)] sm:text-lg">
            {PROFILE.name}
          </span>
          <span
            aria-hidden="true"
            className="hidden text-xs text-[#E5C17B]/65 md:inline"
          >
            ·
          </span>
          <span className="font-body hidden truncate text-xs tracking-wide text-[#EAE3D5]/80 md:inline">
            {PROFILE.role}
          </span>
        </div>

        {/* Navigation Actions */}
        <nav
          aria-label="Portfolio links and view controls"
          className="pointer-events-auto flex shrink-0 items-center gap-2 sm:gap-2.5"
        >
          <div className="hidden items-center gap-2 md:flex">
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.label} (${item.handle})`}
                title={`${item.label} · ${item.handle}`}
                tabIndex={pureArtMode ? -1 : 0}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#DAB978]/22 bg-[#14110E]/78 text-[#EAE3D5]/85 transition-colors hover:border-[#E5C17B]/60 hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5C17B]"
              >
                {renderSocialIcon(item.id)}
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenAllProjects}
            tabIndex={pureArtMode ? -1 : 0}
            aria-expanded={isDrawerOpen}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-[#DAB978]/34 bg-[#16130F]/86 px-2.5 text-xs font-medium tracking-wide text-[#FAF6EE] transition-colors hover:border-[#E5C17B]/75 hover:bg-[#1E1914] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5C17B] sm:px-3"
          >
            <FolderKanban
              className="h-3.5 w-3.5 text-[#E5C17B]"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">All Projects</span>
            <span className="font-mono-metrics text-[11px] text-[#E5C17B]">
              (10)
            </span>
          </button>

          {/* Prominent Auto-Scroll Play / Pause Tour Pill */}
          <button
            type="button"
            onClick={onTogglePlay}
            onMouseUp={(e) => e.currentTarget.blur()}
            tabIndex={pureArtMode ? -1 : 0}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? 'Pause automatic tour' : 'Start automatic 30-second tour'}
            title={isPlaying ? 'Pause Tour (Space)' : 'Auto Tour (Space)'}
            className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium tracking-wide transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5C17B] sm:px-3.5 ${
              isPlaying
                ? 'border-[#E8C47A] bg-[#E8C47A]/22 text-[#FAF6EE] shadow-[0_0_18px_rgba(232,196,122,0.28)] hover:bg-[#E8C47A]/30'
                : 'border-[#E8C47A]/60 bg-[#16130F]/88 text-[#FAF6EE] hover:border-[#E8C47A] hover:bg-[#1F1A14] hover:text-[#E8C47A]'
            }`}
          >
            {isPlaying ? (
              <Pause className="h-3 w-3 fill-current text-[#E8C47A]" aria-hidden="true" />
            ) : (
              <Play className="h-3 w-3 fill-current text-[#E8C47A]" aria-hidden="true" />
            )}
            <span>{isPlaying ? 'Pause Tour' : 'Auto Tour'}</span>
          </button>

          <button
            type="button"
            onClick={onTogglePureArt}
            tabIndex={pureArtMode ? -1 : 0}
            aria-label="Enter Pure Art Mode (H)"
            title="Pure Art Mode (H)"
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-[#EBE2D0]/20 bg-[#14110E]/78 px-2.5 text-xs text-[#EAE3D5]/85 transition-colors hover:border-[#E5C17B]/60 hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5C17B] sm:px-3"
          >
            <EyeOff className="h-3.5 w-3.5 text-[#9ED8EB]" aria-hidden="true" />
            <span className="hidden lg:inline">Pure Art</span>
            <span className="font-mono-metrics hidden text-[10px] text-[#C8BEAE]/80 lg:inline">
              (H)
            </span>
          </button>
        </nav>
      </header>

      {/* Discrete restore handle when Pure Art Mode is active */}
      {pureArtMode && (
        <button
          type="button"
          onClick={onTogglePureArt}
          aria-label="Exit Pure Art Mode (H)"
          title="Restore Portfolio HUD (H)"
          className="fixed top-4 right-5 z-50 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-[#DAB978]/30 bg-[#14110E]/78 px-2.5 text-xs text-[#FAF6EE] opacity-35 transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5C17B] sm:right-7"
        >
          <Eye className="h-3.5 w-3.5 text-[#E5C17B]" aria-hidden="true" />
          <span className="font-mono-metrics text-[11px]">Show UI (H)</span>
        </button>
      )}
    </>
  );
}
