export type VoteDirection = 'up' | 'down';
export type StatusType = 'none' | 'frontrunner' | 'maybe' | 'rejected';
export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface Vote {
  u: string;
  d: VoteDirection;
}

export interface Option {
  id: string;
  label: string;
  desc: string;
  votes: Vote[];
  status: StatusType;
}

export interface SceneElement {
  id: string;
  type: string;
  locked: boolean;
  value: string;
  options: Option[];
  mandatory: boolean;
}

export interface Scene {
  id: string;
  x: number;
  y: number;
  title: string;
  summary: string;
  elements: SceneElement[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  scenes: Scene[];
}

export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
}

export interface Membership {
  userId: string;
  role: MemberRole;
  profile: Profile;
}

export interface AppState {
  projects: Project[];
  users: User[];           // derived from active-project memberships
  currentUserId: string;   // auth.users.id
  currentUserRole: MemberRole | null;  // role in the active project
  activeId: string | null;
}

export interface TallyResult {
  up: number;
  down: number;
  upUsers: string[];
  downUsers: string[];
  mine: VoteDirection | null;
}

export interface ExportPayload {
  kind: string;
  version: number;
  exportedAt: number;
  project: Project;
  users: User[];
}

export interface Actions {
  createProject(name: string): void;
  openProject(id: string): void;
  goHome(): void;
  renameProject(id: string, name: string): void;
  deleteProject(id: string): void;
  duplicateProject(id: string): void;
  exportProject(id: string): void;
  importProject(payload: ExportPayload): void;
  inviteMember(email: string, role: MemberRole): void;
  removeMember(userId: string): void;
  signOut(): void;
  addScene(): void;
  deleteScene(sid: string): void;
  moveScene(sid: string, x: number, y: number): void;
  setSceneField(sid: string, field: 'title' | 'summary', val: string): void;
  addElement(sid: string, type: string): void;
  deleteElement(sid: string, eid: string): void;
  setElementValue(sid: string, eid: string, val: string): void;
  toggleLock(sid: string, eid: string): void;
  addOption(sid: string, eid: string): void;
  deleteOption(sid: string, eid: string, oid: string): void;
  setOptionField(sid: string, eid: string, oid: string, field: 'label' | 'desc', val: string): void;
  cycleStatus(sid: string, eid: string, oid: string): void;
  toggleVote(sid: string, eid: string, oid: string, dir: VoteDirection): void;
}
