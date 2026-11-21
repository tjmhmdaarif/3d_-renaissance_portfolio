export type ProjectDomain = 'agents' | 'voice' | 'industrial';

export interface PortfolioMetric {
  value: string;
  label: string;
}

export interface PortfolioProject {
  id: string;
  chapterIndex: 1 | 2 | 3;
  domain: ProjectDomain;
  domainLabel: string;
  title: string;
  subtitle: string;
  year: string;
  summary: string;
  highlights: string[];
  metric: string;
  stack: string[];
  githubUrl: string;
  badge?: string;
}

export interface InternshipRecord {
  role: string;
  organization: string;
  location: string;
  period: string;
  summary: string;
  highlights: string[];
  stack: string[];
}

export interface SkillDomain {
  id: string;
  title: string;
  subtitle: string;
  items: string[];
}

export interface CertificationRecord {
  title: string;
  issuer: string;
  year: string;
}

export interface HonorRecord {
  id: string;
  title: string;
  organization: string;
  date: string;
  highlight: string;
  detail: string;
}

export interface PortfolioChapter {
  index: number;
  roman: string;
  artworkTitle: string;
  portfolioTitle: string;
  scrollRange: string;
  thesis: string;
  metrics: PortfolioMetric[];
  ctaLabel: string;
  curatorialNote: string;
}

export const PROFILE = {
  name: 'MUHAMMADH AARIF T J',
  role: 'AI Agents & Full-Stack Engineer',
  shortSummary:
    'Open for offers and freelance projects — building production AI agent systems, local-first RAG, and full-stack software.',
  objective:
    'Final-year B.E. ECE student (DR N G P Institute of Technology, 2023–2027, CGPA 7.64) engineering end-to-end AI agent systems, local-first RAG on open-weight models, workflow automation, and low-latency voice pipelines. 6+ public AI projects, 3 live demos, and 600+ automated tests. Open for offers and freelance projects.',
  education: {
    degree: 'B.E. Electronics & Communication Engineering',
    institution: 'DR N G P Institute of Technology',
    period: '2023 – 2027',
    cgpa: '7.64',
  },
  workflow: ['Claude Code', 'OpenCode', 'Hermes', 'OpenClaw'],
  email: 'muhammadhaarif2000@gmail.com',
  phone: '+91 91235 16325',
  location: 'Coimbatore, Tamil Nadu, India',
};

export const SOCIAL_LINKS = [
  {
    id: 'github',
    label: 'GitHub',
    handle: '@tjmhmdaarif',
    url: 'https://github.com/tjmhmdaarif',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    handle: 'in/tjmhmdaarif',
    url: 'https://www.linkedin.com/in/tjmhmdaarif/',
  },
  {
    id: 'leetcode',
    label: 'LeetCode',
    handle: 'u/mhmdaarif',
    url: 'https://leetcode.com/u/mhmdaarif/',
  },
  {
    id: 'archive3d',
    label: 'Previous 3D Portfolio',
    handle: 'burning-sakura',
    url: 'https://burning-sakura.vercel.app',
  },
] as const;

export const PORTFOLIO_CHAPTERS: PortfolioChapter[] = [
  {
    index: 0,
    roman: 'I',
    artworkTitle: 'Helios Rising',
    portfolioTitle: 'Identity & Education',
    scrollRange: '0% – 16%',
    thesis:
      'Open for offers and freelance projects — building production AI agent systems, local-first RAG, and full-stack software.',
    metrics: [
      { value: '6+', label: 'AI Systems' },
      { value: '600+', label: 'Automated Tests' },
      { value: '3', label: 'Live Demos' },
    ],
    ctaLabel: 'Open Phase I Folio',
    curatorialNote:
      'Final-year B.E. ECE student (DR N G P Institute of Technology, 2023–2027, CGPA 7.64) engineering end-to-end AI agent systems, local-first RAG on open-weight models, workflow automation, and low-latency voice pipelines. 6+ public AI projects, 3 live demos, and 600+ automated tests. Open for offers and freelance projects.',
  },
  {
    index: 1,
    roman: 'II',
    artworkTitle: 'The Celestial Chariot',
    portfolioTitle: 'Autonomous Agents',
    scrollRange: '16% – 33%',
    thesis:
      'Multi-agent orchestration, local-first RAG reasoning, and deterministic decision scoring at scale.',
    metrics: [
      { value: '~60x', label: 'Faster Scoring' },
      { value: '404', label: 'Offline Tests' },
      { value: '3', label: 'Agent Systems' },
    ],
    ctaLabel: 'Open Phase II Folio',
    curatorialNote:
      'From autonomous IoT fleet diagnostics to offline-resilient evidence graphs, every agent system is built with deterministic guardrails and verifiable test harnesses.',
  },
  {
    index: 2,
    roman: 'III',
    artworkTitle: 'Sol & Luna',
    portfolioTitle: 'Voice AI & Tooling',
    scrollRange: '33% – 50%',
    thesis:
      'Streaming duplex voice interfaces, local Whisper dictation, repo intelligence, and LLM FinOps.',
    metrics: [
      { value: '250ms', label: 'Voice Latency' },
      { value: '150', label: 'Offline Checks' },
      { value: '4', label: 'Tooling Builds' },
    ],
    ctaLabel: 'Open Phase III Folio',
    curatorialNote:
      'Compressing end-to-end voice turn-around from over 3 seconds down to ~250ms while pairing desktop-native inference with developer and cost telemetry.',
  },
  {
    index: 3,
    roman: 'IV',
    artworkTitle: 'Council of Olympus',
    portfolioTitle: 'Industrial ML & 3D Twins',
    scrollRange: '50% – 66%',
    thesis:
      'Predictive turbine SCADA intelligence, real-time 3D digital twins, and embedded edge hardware.',
    metrics: [
      { value: '15,517', label: 'SCADA Episodes' },
      { value: '<150ms', label: 'Edge Response' },
      { value: 'Finalist', label: 'TECHgium 9th' },
    ],
    ctaLabel: 'Open Phase IV Folio',
    curatorialNote:
      'Bridging physical sensors, telemetry streams, and interactive WebGL spatial twins—spanning national industrial AI finals and embedded prototyping.',
  },
  {
    index: 4,
    roman: 'V',
    artworkTitle: 'The Solar Decree',
    portfolioTitle: 'Stack & Credentials',
    scrollRange: '66% – 83%',
    thesis:
      'End-to-end fluency spanning Python/TypeScript backends, agent harnesses, inference runtimes, and WebGL.',
    metrics: [
      { value: '5', label: 'Core Domains' },
      { value: '6', label: 'Certifications' },
      { value: 'CUDA/CPU', label: 'Local Inference' },
    ],
    ctaLabel: 'Open Phase V Folio',
    curatorialNote:
      'A disciplined toolset uniting distributed backends, deterministic AI tool-use, quantized local runtimes, 3D graphics, and cloud observability.',
  },
  {
    index: 5,
    roman: 'VI',
    artworkTitle: 'The Spark of Creation',
    portfolioTitle: 'Honors & Contact',
    scrollRange: '83% – 100%',
    thesis:
      'National finalist recognition, hackathon awards, open engineering leadership, and direct collaboration.',
    metrics: [
      { value: 'TECHgium', label: '9th Ed. Finalist' },
      { value: '₹30,000', label: 'Hackathon Prize' },
      { value: 'Open', label: 'Offers & Freelance' },
    ],
    ctaLabel: 'Open Phase VI Folio',
    curatorialNote:
      'Open for offers and freelance projects—ready to ship ambitious AI agent systems, real-time voice interfaces, and resilient full-stack software.',
  },
];

export const ALL_PROJECTS: PortfolioProject[] = [
  {
    id: 'agentops-2',
    chapterIndex: 1,
    domain: 'agents',
    domainLabel: 'Autonomous Agent Systems',
    title: 'AgentOps 2.0 — Autonomous IoT Fleet Intelligence',
    subtitle: '6-State Autonomous Loop & Anomaly Triage',
    year: '2026',
    summary:
      'Autonomous telemetry supervisor orchestrating a 6-state diagnostic loop, root-cause synthesis, and policy-gated remediation across distributed IoT fleets.',
    highlights: [
      'Vectorized deterministic anomaly scoring achieving ~60x faster fleet evaluation across simulated IoT telemetry.',
      'Validated across 58 automated pytest suites exercising state transitions, policy gates, and fault recovery.',
    ],
    metric: '~60x Faster Scoring · 6-State Loop · 58 Pytest',
    stack: ['Python', 'FastAPI', 'LangGraph', 'WebSockets', 'Pytest', 'Docker'],
    githubUrl: 'https://github.com/tjmhmdaarif/agentops',
  },
  {
    id: 'whatif',
    chapterIndex: 1,
    domain: 'agents',
    domainLabel: 'Autonomous Agent Systems',
    title: 'WhatIf — Local-First RAG Decision Assistant',
    subtitle: 'Local Ollama Reasoning & Scenario Simulation',
    year: '2026',
    summary:
      'Local-first retrieval-augmented counterfactual engine powered by Ollama, allowing engineers to stress-test decisions strictly on-device.',
    highlights: [
      'Verified across 404 automated offline tests covering hybrid vector/BM25 retrieval and deterministic scenario branching.',
      'Strict citation grounding and local inference ensuring zero cloud data leakage.',
    ],
    metric: 'Local Ollama RAG · 404 Offline Tests',
    stack: ['Python', 'Ollama', 'ChromaDB', 'FastAPI', 'React', 'TypeScript'],
    githubUrl: 'https://github.com/tjmhmdaarif/whatif',
  },
  {
    id: 'aftermath',
    chapterIndex: 1,
    domain: 'agents',
    domainLabel: 'Autonomous Agent Systems',
    title: 'Aftermath Decision Platform',
    subtitle: 'Post-Incident Synthesis & Action Ledger',
    year: '2026',
    summary:
      'Structured decision intelligence platform converting chaotic incident logs and post-mortems into ranked, auditable action graphs.',
    highlights: [
      'Deterministic state transitions linking failure hypotheses, evidence traces, and mitigation owners.',
      'Clean operator UI built for rapid triage under high-signal operational pressure.',
    ],
    metric: 'Auditable Action Graphs · Deterministic Triage',
    stack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
    githubUrl: 'https://github.com/tjmhmdaarif/aftermath-decision-platform',
  },
  {
    id: 'voice-rag',
    chapterIndex: 2,
    domain: 'voice',
    domainLabel: 'Voice & Developer Tooling',
    title: 'Voice-RAG Pipeline',
    subtitle: 'Streaming Duplex Voice with Sarvam AI & ElevenLabs',
    year: '2026',
    summary:
      'Low-latency conversational RAG stack engineered with streaming VAD, Sarvam AI speech intelligence, speculative retrieval, and ElevenLabs voice synthesis.',
    highlights: [
      'Compressed end-to-end voice turn-around from >3s down to ~250ms via overlapped ASR, RAG, and TTS streaming.',
      'Barge-in interruption handling ensuring responsive natural turn-taking.',
    ],
    metric: '>3s → ~250ms Latency · Sarvam AI + ElevenLabs',
    stack: ['Python', 'Sarvam AI', 'ElevenLabs', 'WebRTC', 'FastAPI', 'FAISS'],
    githubUrl: 'https://github.com/tjmhmdaarif/Voice-RAG-Pipeline',
  },
  {
    id: 'flowmini',
    chapterIndex: 2,
    domain: 'voice',
    domainLabel: 'Voice & Developer Tooling',
    title: 'FlowMini — Offline Voice Dictation for Windows',
    subtitle: 'Local Faster-Whisper Push-to-Talk Utility',
    year: '2026',
    summary:
      'Lightweight Windows dictation utility running local Faster-Whisper models with global hotkeys, instant cursor injection, and zero cloud dependencies.',
    highlights: [
      'Hardened across 150 automated offline checks verifying audio buffering, hotkey hooks, and transcription accuracy.',
      'Sub-second local inference tailored for developers, prompts, and technical prose.',
    ],
    metric: 'Local Faster-Whisper · 150 Offline Checks',
    stack: ['Python', 'Faster-Whisper', 'PySide6', 'Win32 API', 'CUDA / CPU'],
    githubUrl: 'https://github.com/tjmhmdaarif/FlowMini',
  },
  {
    id: 'gitauto',
    chapterIndex: 2,
    domain: 'voice',
    domainLabel: 'Voice & Developer Tooling',
    title: 'GitAuto — AI Repository & Skill Scout',
    subtitle: 'NVIDIA NIM Powered Codebase Intelligence',
    year: '2026',
    summary:
      'Developer intelligence agent powered by NVIDIA NIM that ingests GitHub repositories, extracts architectural patterns, and maps verified engineering skills.',
    highlights: [
      'AST-aware repository traversal distinguishing substantive systems code from boilerplate scaffolding.',
      'Generates structured technical briefs, dependency audits, and capability matrices.',
    ],
    metric: 'NVIDIA NIM Scout · AST Codebase Audits',
    stack: ['TypeScript', 'Node.js', 'NVIDIA NIM', 'GitHub API', 'React'],
    githubUrl: 'https://github.com/tjmhmdaarif/gitauto',
  },
  {
    id: 'zabalance',
    chapterIndex: 2,
    domain: 'voice',
    domainLabel: 'Voice & Developer Tooling',
    title: 'Zabalance — API Credit Tracker (FinOps)',
    subtitle: 'Multi-Provider LLM Spend & Token Telemetry',
    year: '2026',
    summary:
      'Focused FinOps cockpit monitoring API credit burn, per-model token economics, and budget threshold alerts across AI providers.',
    highlights: [
      'Unified balance normalization across heterogeneous inference keys and agent harness sessions.',
      'Proactive burn-rate anomaly detection preventing silent quota exhaustion during long-running agent tasks.',
    ],
    metric: 'Multi-Provider FinOps · Real-Time Burn Alerts',
    stack: ['TypeScript', 'React', 'Next.js', 'SQLite / Postgres', 'REST APIs'],
    githubUrl: 'https://github.com/tjmhmdaarif/zabalance-_the_api_credit_tracker',
  },
  {
    id: 'windsense-ai',
    chapterIndex: 3,
    domain: 'industrial',
    domainLabel: 'Industrial AI & 3D Twins',
    title: 'WindSense AI — Predictive Alarm Intelligence',
    subtitle: 'Wind Turbine SCADA Fault Forecasting (LTTS)',
    year: '2025–2026',
    badge: 'TECHgium 9th Ed. Finalist · L&T Technology Services (LTTS)',
    summary:
      'Predictive industrial diagnostics platform modeling wind turbine SCADA sensor streams to forecast critical alarms before unplanned downtime.',
    highlights: [
      'Trained and evaluated across 15,517 SCADA operational episodes to surface early bearing, pitch, and thermal anomalies.',
      'Selected as National Finalist at TECHgium 9th Edition (L&T Technology Services) among thousands of engineering entries.',
    ],
    metric: '15,517 SCADA Episodes · TECHgium Finalist (LTTS)',
    stack: ['Python', 'Scikit-Learn', 'XGBoost', 'Time-Series', 'FastAPI', 'React'],
    githubUrl: 'https://github.com/tjmhmdaarif/windsense-ai',
  },
  {
    id: 'infraguard-2',
    chapterIndex: 3,
    domain: 'industrial',
    domainLabel: 'Industrial AI & 3D Twins',
    title: 'InfraGuard 2.0 & 3D Web Architecture',
    subtitle: 'Three.js / R3F Bridge Digital Twin',
    year: '2025–2026',
    summary:
      'Interactive Three.js & React Three Fiber (R3F) bridge structural digital twin pairing 3D spatial visualization with live sensor telemetry and anomaly alerts.',
    highlights: [
      'Custom WebGL/R3F bridge scene binding structural load & vibration telemetry directly to spatial 3D asset meshes.',
      'Sub-second alert propagation enabling operators to inspect fault corridors in 3D space.',
    ],
    metric: 'Three.js / R3F Bridge Twin · Live Telemetry',
    stack: ['Three.js', 'React Three Fiber', 'React', 'TypeScript', 'WebSockets'],
    githubUrl: 'https://github.com/tjmhmdaarif/InfraGuard-2.0',
  },
  {
    id: 'parkinsons-esp32',
    chapterIndex: 3,
    domain: 'industrial',
    domainLabel: 'Industrial AI & 3D Twins',
    title: "Parkinson's Disease Screening & Smart ESP32 Vehicle",
    subtitle: 'Edge Bio-Signal Screening & Embedded Mobility Control',
    year: '2024',
    summary:
      'Dual-track embedded and ML systems bridging non-invasive motor/vocal Parkinson’s screening with ultra-responsive ESP32 edge vehicle telemetry.',
    highlights: [
      'Achieved <150ms edge control response latency on resource-constrained ESP32 microcontrollers.',
      'Combined feature extraction pipelines for tremor and acoustic biomarkers with real-time hardware feedback.',
    ],
    metric: '<150ms Edge Response · Embedded ML',
    stack: ['C / C++', 'ESP32 / RTOS', 'Python', 'Embedded Sensors', 'Scikit-Learn'],
    githubUrl: 'https://github.com/tjmhmdaarif/Parkinson-s-Disease-Screening-System',
  },
];

export const INTERNSHIP: InternshipRecord = {
  role: 'Embedded Systems Trainee',
  organization: 'Hi Tech Solutions',
  location: 'Nagercoil, Tamil Nadu',
  period: 'Industrial Training',
  summary:
    'Hands-on embedded hardware prototyping, microcontroller interfacing, and real-time sensor telemetry diagnostics in production electronics workflows.',
  highlights: [
    'Designed and debugged microcontroller firmware pipelines for deterministic sensor acquisition and actuator timing.',
    'Collaborated on PCB-level hardware validation, serial communication protocols, and field reliability testing.',
  ],
  stack: ['Embedded C', 'ESP32 / RTOS', 'UART / I2C / SPI', 'Hardware Debugging'],
};

export const SKILL_DOMAINS: SkillDomain[] = [
  {
    id: 'languages-backend',
    title: 'Languages & Backend',
    subtitle: 'Deterministic APIs, concurrency & typed architecture',
    items: [
      'Python',
      'TypeScript',
      'JavaScript',
      'C / C++',
      'SQL',
      'FastAPI',
      'Node.js',
      'REST & WebSockets',
      'Pytest',
    ],
  },
  {
    id: 'applied-ai-harnesses',
    title: 'Applied AI & Agent Harnesses',
    subtitle: 'Multi-step orchestration, RAG & verification harnesses',
    items: [
      'LLMs / RAG',
      'LangGraph',
      'Claude Code',
      'OpenCode',
      'Hermes',
      'OpenClaw',
      'Voice-RAG Pipelines',
      'Offline Eval Harnesses',
    ],
  },
  {
    id: 'models-inference',
    title: 'Models & Inference',
    subtitle: 'Local-first runtimes, speech & predictive modeling',
    items: [
      'Ollama',
      'NVIDIA NIM',
      'Faster-Whisper',
      'Sarvam AI',
      'ElevenLabs',
      'FAISS & ChromaDB',
      'XGBoost & Scikit-Learn',
    ],
  },
  {
    id: 'frontend-3d-data',
    title: 'Frontend, 3D & Data',
    subtitle: 'Interactive spatial scenes & editorial interfaces',
    items: [
      'React',
      'Three.js / R3F',
      'WebGL / GLSL',
      'Next.js',
      'Tailwind CSS',
      'PostgreSQL',
      'SQLite',
    ],
  },
  {
    id: 'cloud-devops-embedded',
    title: 'Cloud, DevOps & Embedded',
    subtitle: 'Containerization, cloud & real-time hardware',
    items: [
      'Docker',
      'Azure',
      'Git & GitHub Actions',
      'ESP32 / RTOS',
      'Embedded C',
      'SCADA Telemetry',
    ],
  },
];

export const CERTIFICATIONS: CertificationRecord[] = [
  {
    title: 'AI Agents & Agentic Workflows Engineering',
    issuer: 'Anthropic / Applied Agentic Systems',
    year: '2026',
  },
  {
    title: 'Retrieval-Augmented Generation & Vector Search',
    issuer: 'DeepLearning.AI',
    year: '2025',
  },
  {
    title: 'Machine Learning & Predictive Time-Series Modeling',
    issuer: 'Stanford / Coursera Specialization',
    year: '2025',
  },
  {
    title: 'Full-Stack TypeScript & Modern React Systems',
    issuer: 'Production Engineering Track',
    year: '2025',
  },
  {
    title: 'Embedded Systems & Microcontroller Interfacing',
    issuer: 'Hi Tech Solutions Training',
    year: '2024',
  },
  {
    title: 'Python Data Structures & Algorithmic Problem Solving',
    issuer: '120-Day DSA & LeetCode Verified Track',
    year: '2025',
  },
];

export const HONORS: HonorRecord[] = [
  {
    id: 'techgium',
    title: 'TECHgium 9th Edition — National Finalist',
    organization: 'L&T Technology Services (LTTS)',
    date: 'May 2026',
    highlight: 'National Finalist',
    detail:
      'Recognized among top national engineering teams for WindSense AI, forecasting wind turbine SCADA alarms across 15,517 operational episodes.',
  },
  {
    id: 'ecotronics',
    title: 'Ecotronics Hackathon — Runner-Up',
    organization: 'National Hardware & Sustainable AI Challenge',
    date: 'February 2026',
    highlight: '₹30,000 Cash Prize',
    detail:
      'Awarded ₹30,000 Runner-Up prize for delivering a real-time sustainable edge-AI monitoring prototype under strict hackathon time constraints.',
  },
  {
    id: 'dsa-leetcode',
    title: 'Daily LeetCode & 120-Day Python DSA Roadmap',
    organization: 'Algorithmic Mastery & Competitive Discipline',
    date: 'Ongoing',
    highlight: 'Daily Practice',
    detail:
      'Consistent problem solving across graphs, dynamic programming, sliding windows, and tree structures in Python.',
  },
  {
    id: 'yi-yuva',
    title: 'Yi Yuva Innovation Vertical Student Chair & Skill on Wheels 2.0',
    organization: 'Young Indians (CII)',
    date: 'June 2025 – June 2026',
    highlight: 'Student Chair',
    detail:
      'Led campus innovation initiatives and technical outreach under Skill on Wheels 2.0, mentoring student builders across workshops and hackathons.',
  },
];
