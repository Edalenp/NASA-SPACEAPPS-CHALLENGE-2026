import clinical from '../../engine/clinical-limits.json';
import { FATIGUE_SOURCE, ADULT_SLEEP_SOURCE } from '../../engine/sleep';
import { guides, visualGuides, ISS_KIT_SOURCE } from '../../data/guides';
import { HEALTH_ACTION_SOURCES } from '../../data/health-actions';
import { protocols } from '../../data/protocols';
import { getReferenceCatalog } from '../../data/nasa/reference';
import hrp from '../../data/nasa/sources.json';
import { rangeReferences } from '../measurements/references';
import manifest from '../../../package.json';

export interface CreditLink { label: string; url: string }
export interface SourceCredit {
  id: string;
  title: string;
  kind: 'Used reference' | 'Historical context' | 'Catalog only' | 'Assets and adaptations' | 'Software';
  purpose: string;
  note: string;
  links: CreditLink[];
}

function unique(links: CreditLink[]): CreditLink[] {
  return [...new Map(links.map(link => [link.url, link])).values()];
}
const named = (source: { title: string; url: string }): CreditLink => ({ label: source.title, url: source.url });
const link = (label: string, url: string): CreditLink => ({ label, url });

/** Credits reuse the citations consumed by the app; they do not define clinical rules. */
export function getProjectSources(): SourceCredit[] {
  const catalog = getReferenceCatalog();
  return [
    {
      id: 'clinical', title: 'Clinical thresholds · AHA, ATS/BTS, ADA, NHLBI and others', kind: 'Used reference',
      purpose: 'The independent monitoring layer cites AHA, ATS/BTS, ADA 2026 sections 2 and 6, NHLBI, Cleveland Clinic, AMBOSS and StatPearls.',
      note: 'App watch/alert labels are project adaptations. Laboratory glucose criteria require context; CGM is monitoring only. Human verification remains pending, and no automatic diagnosis or spaceflight validation is claimed.',
      links: unique(clinical._meta.sources.map(source => link(source.label, source.url))),
    },
    {
      id: 'ranges', title: 'Displayed ranges · MedlinePlus, AASM/SRS, WHO and PVT research', kind: 'Used reference',
      purpose: 'Population intervals, laboratory references, sleep consensus, exercise context and task-specific reaction-time research shown with measurements.',
      note: 'A displayed population interval is separate from NEWS2 and a personal baseline. The single mood rating does not implement WHO-5. The generic reaction task is not the cited 10-minute PVT. NASA exercise is ISS context, not an individual prescription.',
      links: unique(Object.values(rangeReferences).map(source => link(source.source, source.url))),
    },
    {
      id: 'guides', title: 'Measurement guides · MedlinePlus, FDA, CDC, Cleveland Clinic and RCP', kind: 'Used reference',
      purpose: 'Technique summaries and illustrated placement guides name their public sources. NASA kit locations come from the historical 2015 checklist.',
      note: 'Clinical and onboard procedure review remain pending. Sleep, mood and exercise logs are self-report. The original CDC link is retained; automated access has varied. External originals require a connection.',
      links: unique([
        ...Object.values(guides).flatMap(guide => guide.source ? [named(guide.source)] : []),
        ...Object.values(visualGuides).map(guide => named(guide.source)), named(ISS_KIT_SOURCE),
      ]),
    },
    {
      id: 'review-prompts', title: 'Review prompts · MedlinePlus, FDA, NHLBI and NIMH', kind: 'Used reference',
      purpose: 'Public health references support the original summaries shown when a reading or self-report needs professional review.',
      note: 'Draft for medical review. Translating provider to onboard medical officer is project wording, not a NASA-assigned role or institutional triage rule. MedlinePlus encyclopedia articles include third-party A.D.A.M. content.',
      links: unique(HEALTH_ACTION_SOURCES.map(named)),
    },
    {
      id: 'emergency', title: 'Emergency guidance · American Red Cross and NASA NTRS', kind: 'Used reference',
      purpose: 'Red Cross unresponsive-person and heart-attack guidance supports the two prototype graphs. Barratt and Billica (1992), NTRS 19950010359, supplies historical microgravity CPR context.',
      note: 'Onboard roles, handover and contact timing are declared project adaptations. The 1992 research is not a current flight procedure; clinical validation is pending.',
      links: unique(protocols.flatMap(protocol => Object.values(protocol.steps).flatMap(step => step.sources.map(named)))),
    },
    {
      id: 'fatigue', title: 'Fatigue context · NASA V1 6001 and NHLBI', kind: 'Used reference',
      purpose: 'NASA medical operations provides work/rest, sleep opportunity and circadian context; NHLBI supplies the general Earth adult sleep reference.',
      note: 'The factor model, shortfall arithmetic and configurable markers are simulation assumptions. They do not determine a recovery duration, validated fatigue score or fitness for duty.',
      links: [link('NASA-STD-3001 V1 6001 · Medical Operations §6.1', FATIGUE_SOURCE), link('NHLBI · How much sleep is enough?', ADULT_SLEEP_SOURCE)],
    },
    ...catalog.entries.map((entry): SourceCredit => ({
      id: entry.id, title: entry.title,
      kind: ['donki', 'noaa-swpc', 'nasa-3d-resources'].includes(entry.id) ? 'Catalog only' : entry.id === 'iss-medical-kit' ? 'Historical context' : 'Used reference',
      purpose: entry.id === 'news2' ? 'RCP NEWS2 scoring chart and triggers used by the unmodified engine. Spaceflight use is an unvalidated extrapolation.' : entry.purpose,
      note: `${entry.id === 'news2' ? 'Human transcription check pending. ' : ''}${entry.notes} Source metadata checked ${entry.verificationDate}; this does not certify the application.`,
      links: unique([
        ...entry.urls.map((url, index) => link(index === 0 ? entry.title : `${entry.title} · reference ${index + 1}`, url)),
        link(entry.licenseTerms.label, entry.licenseTerms.url),
        ...(entry.id === 'hrp' ? [
          ...hrp.files['hazards.json'].sourceUrls.map(url => link('NASA · The human body in space', url)),
          ...hrp.riskEvidence.map(risk => link(risk.officialTitle, risk.officialUrl)),
        ] : []),
        ...(entry.id === 'news2' ? [link('RCP · Additional guidance and clinical judgement', 'https://www.rcp.ac.uk/media/umzn4ntq/news2_additional-guidance-002-_0.pdf')] : []),
      ]),
    })),
    {
      id: 'anatomy', title: 'Anatomy · DBCLS, HuBMAP/HRA, MakeHuman and open-anatomy-3d', kind: 'Assets and adaptations',
      purpose: 'BodyParts3D © DBCLS (CC BY 4.0); female organs from HuBMAP Human Reference Atlas (CC BY 4.0); female body from MakeHuman (CC0). Adapted by open-anatomy-3d and VITRUVIO.',
      note: 'Runtime materials, shading, male pose, female muscle fitting and derived line art are described in the local attribution. Educational visualization; not a validated anatomical or diagnostic model.',
      links: [link('Model source · MervinR07/open-anatomy-3d', 'https://github.com/MervinR07/open-anatomy-3d'), link('BodyParts3D · DBCLS', 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'), link('HRA · United female v1.10', 'https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.10/'), link('MakeHuman', 'https://github.com/makehumancommunity/makehuman'), link('CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'), link('Full model attribution and modifications', '/models/ATTRIBUTION.md'), link('Model licence', '/models/LICENSE-MODELS.md')],
    },
    {
      id: 'imagery', title: 'Environment imagery · NASA Blue Marble and procedural scenes', kind: 'Assets and adaptations',
      purpose: 'NASA/GSFC Scientific Visualization Studio, Reto Stockli and NASA Earth Observatory supply the Blue Marble texture. Other scenes and markings are illustrative procedural work with AI assistance.',
      note: 'The generated skies and planet use vgpu and @vgpu/wgsl-std. The UTB seedbed emblem is credited with team permission. No live imagery, ephemerides or NASA hardware replica is implied.',
      links: [link('NASA SVS · Blue Marble', 'https://svs.gsfc.nasa.gov/2915/'), link('Environment attribution and generation', '/textures/ATTRIBUTION.md'), link('@vgpu/wgsl-std', 'https://www.npmjs.com/package/@vgpu/wgsl-std'), link('vgpu shader utilities · included MIT notice', '/credits/vgpu-wgsl-std-LICENSE.txt')],
    },
    {
      id: 'design', title: 'Interface assets · React Bits and IBM Plex', kind: 'Assets and adaptations',
      purpose: 'Ghost Fibers by David Haz / React Bits is adapted to plain CSS and a VITRUVIO animation controller. IBM Plex Sans and Mono are distributed through Fontsource.',
      note: 'React Bits publishes MIT + Commons Clause conditions; its adapted code is not covered by the project MIT licence. IBM Plex uses SIL OFL 1.1. Original notices are included locally.',
      links: [link('React Bits · Ghost Fibers', 'https://reactbits.dev/backgrounds/ghost-fibers'), link('React Bits · upstream licence', 'https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md'), link('React Bits · included notice', '/credits/react-bits-LICENSE.txt'), link('IBM Plex', 'https://github.com/IBM/plex'), link('IBM Plex Sans · included OFL notice', '/credits/ibm-plex-sans-LICENSE.txt'), link('IBM Plex Mono · included OFL notice', '/credits/ibm-plex-mono-LICENSE.txt')],
    },
    {
      id: 'software', title: 'Software · runtime libraries and development tools', kind: 'Software',
      purpose: 'React, Three.js / React Three Fiber / Drei, GSAP, Zustand, Dexie, Radix, Lucide, Vite PWA and the remaining direct dependencies are listed from the project manifest.',
      note: 'OpenAI Codex and Anthropic Claude assisted code, documentation, research and illustrations. Tests do not establish clinical validation. Each dependency retains its own licence; version specifications below come from package.json.',
      links: Object.entries({ ...manifest.dependencies, ...manifest.devDependencies }).map(([name, version]) => link(`${name} ${version}`, `https://www.npmjs.com/package/${name}`)),
    },
  ];
}
