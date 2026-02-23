import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import type {
  CitizenDashboardData,
  VolunteerDashboardData,
  StaffDashboardData,
  AdminDashboardData,
} from "@/types/dashboard";

/* ── Generic state shape ─────────────────────────────────────────── */

interface DashboardState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

function initialState<T>(): DashboardState<T> {
  return { data: null, isLoading: false, error: null };
}

/* ── Citizen ─────────────────────────────────────────────────────── */

export function useCitizenDashboard() {
  const [state, setState] = useState<DashboardState<CitizenDashboardData>>(
    initialState()
  );

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await api.getCitizenDashboard();
      setState({ data: res.data, isLoading: false, error: null });
      return res.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load citizen dashboard";
      setState({ data: null, isLoading: false, error: message });
      return null;
    }
  }, []);

  return { ...state, fetch };
}

/* ── Volunteer ───────────────────────────────────────────────────── */

export function useVolunteerDashboard() {
  const [state, setState] = useState<DashboardState<VolunteerDashboardData>>(
    initialState()
  );

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await api.getVolunteerDashboard();
      setState({ data: res.data, isLoading: false, error: null });
      return res.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load volunteer dashboard";
      setState({ data: null, isLoading: false, error: message });
      return null;
    }
  }, []);

  return { ...state, fetch };
}

/* ── Staff ───────────────────────────────────────────────────────── */

export function useStaffDashboard() {
  const [state, setState] = useState<DashboardState<StaffDashboardData>>(
    initialState()
  );

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await api.getStaffDashboard();
      setState({ data: res.data, isLoading: false, error: null });
      return res.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load staff dashboard";
      setState({ data: null, isLoading: false, error: message });
      return null;
    }
  }, []);

  return { ...state, fetch };
}

/* ── Admin ───────────────────────────────────────────────────────── */

export function useAdminDashboard() {
  const [state, setState] = useState<DashboardState<AdminDashboardData>>(
    initialState()
  );

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await api.getAdminDashboard();
      setState({ data: res.data, isLoading: false, error: null });
      return res.data;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load admin dashboard";
      setState({ data: null, isLoading: false, error: message });
      return null;
    }
  }, []);

  return { ...state, fetch };
}
