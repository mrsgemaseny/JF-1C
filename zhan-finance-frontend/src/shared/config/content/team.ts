export interface TeamMember {
  nameKey: string;
  roleKey: string;
  bioKey?: string;
  photo: string;
  highlight?: boolean;
}

export const teamLeader: TeamMember = {
  nameKey: 'landing:team.0.name',
  roleKey: 'landing:team.0.role',
  bioKey: 'landing:team.0.bio',
  photo: '',
  highlight: true,
};

export const teamSpecialists: TeamMember[] = [
  { nameKey: 'landing:team.1.name', roleKey: 'landing:team.1.role', bioKey: 'landing:team.1.bio', photo: '' },
  { nameKey: 'landing:team.2.name', roleKey: 'landing:team.2.role', bioKey: 'landing:team.2.bio', photo: '' },
  { nameKey: 'landing:team.3.name', roleKey: 'landing:team.3.role', bioKey: 'landing:team.3.bio', photo: '' },
  { nameKey: 'landing:team.4.name', roleKey: 'landing:team.4.role', bioKey: 'landing:team.4.bio', photo: '' },
  { nameKey: 'landing:team.5.name', roleKey: 'landing:team.5.role', bioKey: 'landing:team.5.bio', photo: '' },
  { nameKey: 'landing:team.6.name', roleKey: 'landing:team.6.role', bioKey: 'landing:team.6.bio', photo: '' },
  { nameKey: 'landing:team.7.name', roleKey: 'landing:team.7.role', bioKey: 'landing:team.7.bio', photo: '' },
  { nameKey: 'landing:team.8.name', roleKey: 'landing:team.8.role', bioKey: 'landing:team.8.bio', photo: '' },
];

export const teamRows: TeamMember[][] = [
  [teamLeader],
  teamSpecialists.slice(0, 2),
  teamSpecialists.slice(2),
];
