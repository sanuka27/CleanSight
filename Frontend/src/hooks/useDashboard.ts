// DEPRECATED: Use @/hooks/useDashboardQueries.ts instead
// This file uses manual useState/useCallback patterns
// The new hooks use React Query for better caching and state management

export {
  useCitizenDashboardQuery as useCitizenDashboard,
  useVolunteerDashboardQuery as useVolunteerDashboard,
  useStaffDashboardQuery as useStaffDashboard,
  useAdminDashboardQuery as useAdminDashboard,
} from './useDashboardQueries';
