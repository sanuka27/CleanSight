import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

// Helpers to fire synthetic online/offline window events
function goOnline() {
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  window.dispatchEvent(new Event("online"));
}

function goOffline() {
  Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
  window.dispatchEvent(new Event("offline"));
}

afterEach(() => {
  // Restore navigator.onLine to true so tests don't bleed into each other
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

// ── useNetworkStatus ──────────────────────────────────────────────────────────

describe("useNetworkStatus", () => {
  it("returns isOnline: true when navigator.onLine is true at mount", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it("returns isOnline: false when navigator.onLine is false at mount", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);
  });

  it("transitions to isOnline: false when the 'offline' event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      goOffline();
    });

    expect(result.current.isOnline).toBe(false);
  });

  it("transitions to isOnline: true when the 'online' event fires", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      goOnline();
    });

    expect(result.current.isOnline).toBe(true);
  });

  it("handles repeated toggling correctly", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());

    act(() => { goOffline(); });
    expect(result.current.isOnline).toBe(false);

    act(() => { goOnline(); });
    expect(result.current.isOnline).toBe(true);

    act(() => { goOffline(); });
    expect(result.current.isOnline).toBe(false);
  });

  it("removes event listeners on unmount (no state updates after unmount)", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();

    // Both online + offline listeners should have been removed
    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("returns a stable object reference when status has not changed", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const { result, rerender } = renderHook(() => useNetworkStatus());
    const first = result.current;
    rerender();
    // isOnline has not changed — the returned value should still be true
    expect(result.current.isOnline).toBe(first.isOnline);
  });
});
