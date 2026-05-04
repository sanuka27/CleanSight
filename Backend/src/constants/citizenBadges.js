export const CITIZEN_BADGES = [
  {
    id: 'first_report',
    name: 'First Report',
    description: 'Submitted your first waste report.',
    icon: 'sparkles',
    criteria: { reportsSubmitted: 1 },
  },
  {
    id: 'report_5',
    name: 'Eagle Eye',
    description: 'Submitted 5 waste reports.',
    icon: 'eye',
    criteria: { reportsSubmitted: 5 },
  },
  {
    id: 'report_10',
    name: 'Active Spotter',
    description: 'Submitted 10 waste reports.',
    icon: 'megaphone',
    criteria: { reportsSubmitted: 10 },
  },
  {
    id: 'report_25',
    name: 'Community Watch',
    description: 'Submitted 25 waste reports.',
    icon: 'shield-check',
    criteria: { reportsSubmitted: 25 },
  },
  {
    id: 'report_50',
    name: 'Vigilant Citizen',
    description: 'Submitted 50 waste reports.',
    icon: 'award',
    criteria: { reportsSubmitted: 50 },
  },
  {
    id: 'report_100',
    name: 'City Guardian',
    description: 'Submitted 100 waste reports.',
    icon: 'trophy',
    criteria: { reportsSubmitted: 100 },
  },
];

export default CITIZEN_BADGES;
