export interface TeamMember {
  address: string;
  name?: string;
  role?: string;
}

export interface Team {
  id: string;
  name: string;
  treasury?: string;
  members: TeamMember[];
  createdAt: number;
}

const KEY = 'streampay:teams';

export function listTeams(): Team[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Team[];
  } catch {
    return [];
  }
}

function persist(teams: Team[]): void {
  localStorage.setItem(KEY, JSON.stringify(teams));
}

export function createTeam(name: string, treasury?: string): Team {
  const team: Team = {
    id: crypto.randomUUID(),
    name,
    treasury,
    members: [],
    createdAt: Date.now(),
  };
  persist([team, ...listTeams()]);
  return team;
}

export function updateTeam(updated: Team): void {
  persist(listTeams().map((t) => (t.id === updated.id ? updated : t)));
}

export function removeTeam(id: string): void {
  persist(listTeams().filter((t) => t.id !== id));
}
