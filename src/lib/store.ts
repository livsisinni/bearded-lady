import type { AppState, Option, Scene, SceneElement, TallyResult, User } from './types';

export const uid = (): string => crypto.randomUUID();

export const ELEMENT_TYPES = [
  'Location', 'Characters', 'Tone', 'Plot beat',
  'Dialogue', 'Wardrobe & props', 'Camera',
] as const;

export const STATUS_ORDER = ['none', 'frontrunner', 'maybe', 'rejected'] as const;

export const STATUS_LABEL: Record<string, string> = {
  none: 'Set status',
  frontrunner: 'Frontrunner',
  maybe: 'Maybe',
  rejected: 'Rejected',
};

export const AVATAR_COLORS = [
  'oklch(0.62 0.13 25)', 'oklch(0.62 0.13 145)', 'oklch(0.62 0.13 250)',
  'oklch(0.62 0.13 300)', 'oklch(0.62 0.13 75)', 'oklch(0.62 0.13 195)',
  'oklch(0.62 0.13 340)', 'oklch(0.62 0.13 110)',
];

export const THEMES = [
  { id: 'daylight', label: 'Daylight' },
  { id: 'blueprint', label: 'Blueprint' },
  { id: 'editorial', label: 'Editorial' },
];

export function initials(name: string): string {
  const parts = (name || '?').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function tallyVotes(opt: Option, currentUserId: string): TallyResult {
  const votes = opt.votes || [];
  const upUsers = votes.filter((v) => v.d === 'up').map((v) => v.u);
  const downUsers = votes.filter((v) => v.d === 'down').map((v) => v.u);
  const mineV = votes.find((v) => v.u === currentUserId);
  return { up: upUsers.length, down: downUsers.length, upUsers, downUsers, mine: mineV ? mineV.d : null };
}

export function mapById<T extends { id: string }>(arr: T[], id: string, fn: (x: T) => T): T[] {
  return arr.map((x) => (x.id === id ? fn(x) : x));
}

export function freshPlotBeat(): SceneElement {
  return { id: uid(), type: 'Plot beat', locked: true, value: '', options: [], mandatory: true };
}

function lockedEl(type: string, value: string): SceneElement {
  return { id: uid(), type, locked: true, value, options: [], mandatory: type === 'Plot beat' };
}

function openEl(type: string, options: Partial<Option>[]): SceneElement {
  return {
    id: uid(), type, locked: false, value: '', mandatory: type === 'Plot beat',
    options: options.map((o) => ({
      id: uid(), status: 'none' as const, desc: '', label: '', votes: [], ...o,
    })),
  };
}

function seedScenes(): Scene[] {
  return [
    {
      id: uid(), x: 80, y: 80, title: 'Limbo',
      summary: 'The end scene. A tired, disheveled crew of ~20 circle for another round of limbo. Our everyman asks how long this goes on for.',
      elements: [
        lockedEl('Plot beat', 'The crew lines up for another round of limbo. Everyman asks the man ahead of him, “Hey, when does this stop?” — and gets the answer.'),
        lockedEl('Dialogue', 'EVERYMAN: “Hey, when does this stop?”\nMAN AHEAD: “Oh, never.”'),
        lockedEl('Tone', 'Deadpan bleak comedy. Exhaustion played completely straight.'),
        lockedEl('Characters', 'Everyman + ~20 weary, disheveled crew. The man ahead in line delivers the button line.'),
        openEl('Location', [
          { label: 'Basement', desc: 'Low ceiling, fluorescent buzz, concrete floor. Claustrophobic and endless-feeling.', status: 'frontrunner' },
          { label: 'Corporate office', desc: 'Limbo bar between two cubicle rows. The mundane-purgatory read.', status: 'maybe' },
          { label: 'Backyard', desc: 'Sad string lights, dead grass. Feels too pleasant for the gag.', status: 'rejected' },
        ]),
        openEl('Camera', [
          { label: 'Locked-off wide', desc: 'Static, observational. Lets the line stretch out of frame.', status: 'frontrunner' },
          { label: 'Slow creeping push-in', desc: 'Pushes toward the everyman as the line never ends.', status: 'maybe' },
        ]),
        openEl('Wardrobe & props', [
          { label: 'Disheveled formalwear', desc: 'Untucked shirts, loosened ties — they dressed up for something that never came.', status: 'maybe' },
          { label: 'Damp casual', desc: "Everyday clothes, sweat-stuck. Reads more 'stuck at a party.'", status: 'none' },
        ]),
      ],
    },
    {
      id: uid(), x: 520, y: 150, title: 'Stamp cutaway',
      summary: 'Quick cutaway. The everyman sits with a stack of envelopes and a sheet of self-adhesive stamps — and licks one anyway.',
      elements: [
        lockedEl('Plot beat', 'Everyman, mid-task, licks an adhesive stamp despite the redundancy, then moans quietly to himself before pressing it down.'),
        lockedEl('Tone', 'Quiet absurdist melancholy. A small, private defeat.'),
        lockedEl('Wardrobe & props', 'Stack of envelopes, a sheet of peel-and-stick stamps, maybe a single desk lamp.'),
        openEl('Location', [
          { label: 'Living-room couch', desc: 'Slumped into cushions, envelopes spread on the coffee table.', status: 'frontrunner' },
          { label: 'Dim office cubicle', desc: 'After hours, one lamp. Lonelier, more corporate.', status: 'maybe' },
        ]),
        openEl('Camera', [
          { label: 'Static medium', desc: 'We sit with him. The moan lands in the stillness.', status: 'maybe' },
          { label: 'Tight insert on tongue + stamp', desc: 'Macro on the redundant lick. Uncomfortably close.', status: 'frontrunner' },
        ]),
      ],
    },
  ];
}

const SEED_USERS: User[] = [{ id: 'u-you', name: 'You', color: AVATAR_COLORS[2] }];

export function seedState(): AppState {
  return {
    projects: [
      { id: uid(), name: 'Untitled Script', createdAt: Date.now(), updatedAt: Date.now(), scenes: seedScenes() },
    ],
    users: SEED_USERS,
    currentUserId: 'u-you',
    currentUserRole: null,
    activeId: null,
  };
}

export const LS_STATE = 'scene-builder-state-v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(LS_STATE);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      s.activeId = null;
      return s;
    }
  } catch { /* ignore */ }
  return seedState();
}
