import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  isScheduleGrid,
  type ScheduleCell,
  type WeeklyScheduleGrid,
} from "@/lib/weeklyScheduleFromText";
import type { Json } from "@/integrations/supabase/types";

export const SCHEDULE_UPDATED_EVENT = "needly:schedule-updated";

// Tell every other consumer of `useWeeklySchedule` (e.g. My Day open in
// another tab, or the dashboard) that the grid changed. Settings calls this
// after a successful save so listeners refetch.
export function emitScheduleUpdated(source?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SCHEDULE_UPDATED_EVENT, { detail: { source } }),
  );
}

const emptyGrid = (): WeeklyScheduleGrid => ({
  cells: Array.from({ length: 7 }, () => Array<ScheduleCell>(24).fill(null)),
  source: "",
  generatedAt: new Date().toISOString(),
});

export function useWeeklySchedule() {
  const { user } = useAuth();
  const [grid, setGrid] = useState<WeeklyScheduleGrid | null>(null);
  const [scheduleText, setScheduleText] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Random per-instance id so we can ignore our own broadcast events.
  const instanceIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );

  const refetch = useCallback(async () => {
    if (!user) {
      setGrid(null);
      setScheduleText("");
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_profiles")
      .select("weekly_schedule_grid, weekly_schedule_context")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.weekly_schedule_grid && isScheduleGrid(data.weekly_schedule_grid)) {
      setGrid(data.weekly_schedule_grid);
    } else {
      setGrid(null);
    }
    setScheduleText(data?.weekly_schedule_context ?? "");
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);

  // Keep the grid fresh when the user comes back to this tab or another part
  // of the app updates the schedule.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };
    const onScheduleEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ source?: string }>).detail;
      if (detail?.source && detail.source === instanceIdRef.current) return;
      refetch();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(SCHEDULE_UPDATED_EVENT, onScheduleEvent);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(SCHEDULE_UPDATED_EVENT, onScheduleEvent);
    };
  }, [refetch]);

  // Debounced upsert. We keep the latest pending grid in a ref so rapid
  // edits coalesce into one network call.
  const pendingRef = useRef<WeeklyScheduleGrid | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (!user) return;
    const next = pendingRef.current;
    if (!next) return;
    pendingRef.current = null;
    setSaving(true);
    const { error } = await supabase.from("user_profiles").upsert(
      { user_id: user.id, weekly_schedule_grid: next as unknown as Json },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      toast.error(`Couldn't save schedule: ${error.message}`);
      return;
    }
    emitScheduleUpdated(instanceIdRef.current);
  }, [user]);

  const save = useCallback(
    (next: WeeklyScheduleGrid) => {
      setGrid(next); // optimistic
      pendingRef.current = next;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 500);
    },
    [flush],
  );

  // Edit a single hour cell on a given day index.
  const setCell = useCallback(
    (dayIdx: number, hour: number, label: ScheduleCell) => {
      const base = grid ?? emptyGrid();
      const cells = base.cells.map((row, i) =>
        i === dayIdx ? row.map((c, h) => (h === hour ? label : c)) : row.slice(),
      );
      save({
        ...base,
        cells,
        generatedAt: new Date().toISOString(),
      });
    },
    [grid, save],
  );

  // Bulk set a range of hours on a day.
  const setRange = useCallback(
    (dayIdx: number, startHour: number, endHour: number, label: ScheduleCell) => {
      const base = grid ?? emptyGrid();
      const cells = base.cells.map((row, i) => {
        if (i !== dayIdx) return row.slice();
        return row.map((c, h) => (h >= startHour && h < endHour ? label : c));
      });
      save({
        ...base,
        cells,
        generatedAt: new Date().toISOString(),
      });
    },
    [grid, save],
  );

  return useMemo(
    () => ({
      grid,
      scheduleText,
      loading,
      saving,
      refetch,
      setCell,
      setRange,
      save,
    }),
    [grid, scheduleText, loading, saving, refetch, setCell, setRange, save],
  );
}
