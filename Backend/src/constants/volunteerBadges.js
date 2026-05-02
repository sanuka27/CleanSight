export const VOLUNTEER_BADGES = [
  {
    id: 'first_cleanup',
    name: 'First Cleanup',
    description: 'Resolved your first report.',
    icon: 'sparkles',
    criteria: { totalCleanups: 1 },
  },
  {
    id: 'cleanup_5',
    name: 'Helping Hand',
    description: 'Resolved 5 reports.',
    icon: 'hand-heart',
    criteria: { totalCleanups: 5 },
  },
  {
    id: 'cleanup_10',
    name: 'Cleanup Crew',
    description: 'Resolved 10 reports.',
    icon: 'medal',
    criteria: { totalCleanups: 10 },
  },
  {
    id: 'cleanup_25',
    name: 'Community Guardian',
    description: 'Resolved 25 reports.',
    icon: 'shield-check',
    criteria: { totalCleanups: 25 },
  },
  {
    id: 'cleanup_50',
    name: 'Neighborhood Hero',
    description: 'Resolved 50 reports.',
    icon: 'trophy',
    criteria: { totalCleanups: 50 },
  },
  {
    id: 'cleanup_75',
    name: 'Cleanup Captain',
    description: 'Resolved 75 reports.',
    icon: 'award',
    criteria: { totalCleanups: 75 },
  },
  {
    id: 'cleanup_100',
    name: 'Centurion',
    description: 'Resolved 100 reports.',
    icon: 'trophy',
    criteria: { totalCleanups: 100 },
  },
  {
    id: 'cleanup_150',
    name: 'Cleanup Legend',
    description: 'Resolved 150 reports.',
    icon: 'shield-check',
    criteria: { totalCleanups: 150 },
  },
  {
    id: 'cleanup_200',
    name: 'City Guardian',
    description: 'Resolved 200 reports.',
    icon: 'medal',
    criteria: { totalCleanups: 200 },
  },
  {
    id: 'cleanup_300',
    name: 'Green Icon',
    description: 'Resolved 300 reports.',
    icon: 'sparkles',
    criteria: { totalCleanups: 300 },
  },
];

export default VOLUNTEER_BADGES;
