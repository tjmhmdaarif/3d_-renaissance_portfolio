import { type FormEvent, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  X,
} from 'lucide-react';
import { PROFILE, SOCIAL_LINKS } from '../../data/portfolio';
import { GitHubIcon, LeetCodeIcon, LinkedInIcon } from './CelestialIcons';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [roleMessage, setRoleMessage] = useState(
    'Hello Muhammadh, we would like to request your resume and discuss an AI Agents / Full-Stack engineering role or freelance project.',
  );
  const [requestSent, setRequestSent] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  if (!isOpen) return null;

  const buildMailtoUrl = () => {
    const subject = encodeURIComponent(
      'Resume Request - Muhammadh Aarif T J',
    );
    const senderInfo = [
      name.trim() ? `Name: ${name.trim()}` : null,
      recruiterEmail.trim()
        ? `Organization / Email: ${recruiterEmail.trim()}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    const bodyText = [
      senderInfo,
      senderInfo ? '' : null,
      roleMessage.trim() ||
        'Requesting resume and availability for full-time engineering roles or freelance projects.',
    ]
      .filter((line) => line !== null)
      .join('\n');

    return `mailto:${PROFILE.email}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
  };

  const handleSubmitResumeRequest = (e: FormEvent) => {
    e.preventDefault();
    const mailtoUrl = buildMailtoUrl();
    const anchor = document.createElement('a');
    anchor.href = mailtoUrl;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setRequestSent(true);
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2200);
    }
  };

  const handleCopyDraft = async () => {
    const draft = `To: ${PROFILE.email}\nSubject: Resume Request - Muhammadh Aarif T J\n\nName: ${name || '(Not specified)'}\nOrganization / Email: ${recruiterEmail || '(Not specified)'}\n\n${roleMessage}`;
    try {
      await navigator.clipboard.writeText(draft);
      setCopiedDraft(true);
      window.setTimeout(() => setCopiedDraft(false), 2200);
    } catch {
      setCopiedDraft(true);
      window.setTimeout(() => setCopiedDraft(false), 2200);
    }
  };

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
      role="dialog"
      aria-modal="true"
      aria-label="Contact and Resume Request — Muhammadh Aarif T J"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-[#0B0907]/62 backdrop-blur-sm"
      />

      {/* Frosted Museum Glass Panel */}
      <div className="parchment-grain animate-folio-reveal relative z-10 max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-[#E8C47A]/40 bg-[#15110E]/88 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.75)] backdrop-blur-[22px] backdrop-saturate-[140%] folio-scroll sm:p-7">
        {/* Top gilt specular hairline */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#E8C47A]/70 to-transparent"
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#DAB978]/20 pb-4">
          <div>
            <p className="font-mono-metrics inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.18em] text-[#E8C47A] uppercase">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              <span>Direct Collaboration &amp; Resume Dispatch</span>
            </p>
            <h2 className="font-display mt-1 text-3xl font-medium tracking-wide text-[#FAF6EE]">
              <span className="swash-initial">C</span>ontact &amp;{' '}
              <span className="swash-initial">R</span>esume{' '}
              <span className="swash-initial">R</span>equest
            </h2>
            <p className="font-body mt-1 text-xs text-[#EAE3D5]/80">
              {PROFILE.name} · {PROFILE.role} · Open for offers &amp; freelance projects
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Contact Modal (Escape)"
            title="Close (Esc)"
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#EBE2D0]/20 bg-[#1B1713]/85 text-[#EAE3D5] transition-colors hover:border-[#E8C47A]/65 hover:text-[#FAF6EE] focus-visible:outline-2 focus-visible:outline-[#E8C47A]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Two-Column Body: Request Resume Form + Direct Actions */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* Request Resume Form */}
          <form
            onSubmit={handleSubmitResumeRequest}
            className="space-y-3.5 md:col-span-7"
          >
            <div>
              <label
                htmlFor="contact-name"
                className="font-mono-metrics block text-[10.5px] tracking-[0.14em] text-[#E8C47A]/90 uppercase"
              >
                Your Name
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setRequestSent(false);
                }}
                placeholder="e.g. Ananya Rao"
                className="font-body mt-1.5 w-full rounded-lg border border-[#DAB978]/26 bg-[#1C1712]/80 px-3 py-2 text-sm text-[#FAF6EE] placeholder:text-[#C8BEAE]/45 focus:border-[#E8C47A] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="contact-org-email"
                className="font-mono-metrics block text-[10.5px] tracking-[0.14em] text-[#E8C47A]/90 uppercase"
              >
                Organization / Recruiter Email
              </label>
              <input
                id="contact-org-email"
                type="text"
                value={recruiterEmail}
                onChange={(e) => {
                  setRecruiterEmail(e.target.value);
                  setRequestSent(false);
                }}
                placeholder="team@company.com"
                className="font-body mt-1.5 w-full rounded-lg border border-[#DAB978]/26 bg-[#1C1712]/80 px-3 py-2 text-sm text-[#FAF6EE] placeholder:text-[#C8BEAE]/45 focus:border-[#E8C47A] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="font-mono-metrics block text-[10.5px] tracking-[0.14em] text-[#E8C47A]/90 uppercase"
              >
                Role / Message
              </label>
              <textarea
                id="contact-message"
                rows={3}
                value={roleMessage}
                onChange={(e) => {
                  setRoleMessage(e.target.value);
                  setRequestSent(false);
                }}
                className="font-body mt-1.5 w-full resize-none rounded-lg border border-[#DAB978]/26 bg-[#1C1712]/80 px-3 py-2 text-sm leading-relaxed text-[#FAF6EE] placeholder:text-[#C8BEAE]/45 focus:border-[#E8C47A] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E8C47A]/70 bg-[#E8C47A] px-4 py-2 text-xs font-semibold tracking-wide text-[#12100E] transition-colors hover:bg-[#f2d393] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF6EE]"
              >
                <span>Send Resume Request</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {requestSent && (
                <button
                  type="button"
                  onClick={handleCopyDraft}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#9ED8EB]/45 bg-[#9ED8EB]/12 px-3 py-2 text-xs font-medium text-[#FAF6EE] transition-colors hover:border-[#9ED8EB]"
                >
                  {copiedDraft ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#9ED8EB]" aria-hidden="true" />
                      <span>Draft Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#9ED8EB]" aria-hidden="true" />
                      <span>Copy Request Text</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {requestSent && (
              <p
                role="status"
                className="font-body rounded-lg border border-[#9ED8EB]/32 bg-[#9ED8EB]/10 px-3 py-2 text-xs text-[#FAF6EE]"
              >
                Resume request prepared for{' '}
                <span className="font-mono-metrics text-[#E8C47A]">
                  {PROFILE.email}
                </span>
                . If your mail client did not open automatically, copy the email or request text beside this form.
              </p>
            )}
          </form>

          {/* Direct Contact & Instant Actions */}
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#DAB978]/24 bg-[#1A1511]/75 p-4 md:col-span-5">
            <div className="space-y-3.5">
              <p className="font-mono-metrics text-[10.5px] tracking-[0.16em] text-[#E8C47A] uppercase">
                Direct Channels
              </p>

              {/* Email + 1-click Copy */}
              <div className="space-y-1.5 border-b border-[#EBE2D0]/12 pb-3">
                <a
                  href={`mailto:${PROFILE.email}`}
                  className="font-mono-metrics flex items-center gap-2 text-xs text-[#FAF6EE] transition-colors hover:text-[#E8C47A]"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-[#E8C47A]" aria-hidden="true" />
                  <span className="truncate">{PROFILE.email}</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#E8C47A]/45 bg-[#E8C47A]/14 px-2.5 py-1 text-[11.5px] font-medium text-[#FAF6EE] transition-colors hover:border-[#E8C47A] hover:bg-[#E8C47A]/24 focus-visible:outline-2 focus-visible:outline-[#E8C47A]"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#9ED8EB]" aria-hidden="true" />
                      <span>Copied ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#E8C47A]" aria-hidden="true" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>

              {/* Call / WhatsApp */}
              <div className="space-y-2 border-b border-[#EBE2D0]/12 pb-3">
                <p className="font-mono-metrics flex items-center gap-2 text-xs text-[#FAF6EE]">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#E8C47A]" aria-hidden="true" />
                  <span>{PROFILE.phone}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <a
                    href={`tel:${PROFILE.phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1 rounded-md border border-[#DAB978]/26 bg-[#14110E]/80 px-2.5 py-1 text-[11px] text-[#EAE3D5] transition-colors hover:border-[#E8C47A] hover:text-[#FAF6EE]"
                  >
                    <Phone className="h-3 w-3 text-[#E8C47A]" aria-hidden="true" />
                    <span>Call</span>
                  </a>
                  <a
                    href="https://wa.me/919123516325"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-[#DAB978]/26 bg-[#14110E]/80 px-2.5 py-1 text-[11px] text-[#EAE3D5] transition-colors hover:border-[#9ED8EB] hover:text-[#FAF6EE]"
                  >
                    <MessageCircle className="h-3 w-3 text-[#9ED8EB]" aria-hidden="true" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Location */}
              <p className="font-body flex items-center gap-2 text-xs text-[#C8BEAE]">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#9ED8EB]" aria-hidden="true" />
                <span>{PROFILE.location}</span>
              </p>
            </div>

            {/* External Profiles */}
            <div className="grid grid-cols-2 gap-1.5 pt-2">
              {SOCIAL_LINKS.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-1.5 rounded-lg border border-[#DAB978]/22 bg-[#14110E]/80 px-2.5 py-2 text-[11.5px] font-medium text-[#EAE3D5] transition-colors hover:border-[#E8C47A]/60 hover:text-[#FAF6EE]"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="text-[#E8C47A]">
                      {renderSocialIcon(item.id)}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ArrowUpRight className="h-3 w-3 shrink-0 text-[#C8BEAE]/75" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
