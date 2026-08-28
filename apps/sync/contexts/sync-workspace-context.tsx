import type {
  VenueLocation,
  VenueServiceBoard,
  VenueWorkspace,
} from "@chewbuu/aws-blocks";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { venueApi } from "@/lib/venue-api";

interface SyncWorkspaceContextValue {
  board: VenueServiceBoard | null;
  error: string | null;
  loading: boolean;
  locations: VenueLocation[];
  refresh: (showSpinner?: boolean) => Promise<void>;
  refreshing: boolean;
  selectedLocation: VenueLocation | null;
  selectedLocationId: string | null;
  selectLocation: (locationId: string) => void;
  workspace: VenueWorkspace | null;
}
const Context = createContext<SyncWorkspaceContextValue | undefined>(undefined);

export function SyncWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locations, setLocations] = useState<VenueLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [workspace, setWorkspace] = useState<VenueWorkspace | null>(null);
  const [board, setBoard] = useState<VenueServiceBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setRefreshing(true);
      try {
        const response = await venueApi.getLocations();
        setLocations(response.locations);
        const locationId =
          selectedLocationId ?? response.locations[0]?.id ?? null;
        if (!locationId) {
          setWorkspace(null);
          setBoard(null);
          setSelectedLocationId(null);
          setError(null);
          return;
        }
        if (locationId !== selectedLocationId)
          setSelectedLocationId(locationId);
        const [workspaceResult, boardResult] = await Promise.allSettled([
          venueApi.getWorkspace(locationId),
          venueApi.getServiceBoard(locationId),
        ]);
        if (workspaceResult.status === "rejected") throw workspaceResult.reason;
        setWorkspace(workspaceResult.value);
        if (boardResult.status === "fulfilled") {
          setBoard(boardResult.value);
          setError(null);
        } else {
          setBoard(null);
          setError(
            boardResult.reason instanceof Error
              ? boardResult.reason.message
              : "Service board is unavailable."
          );
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "We could not load this venue workspace."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedLocationId]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!selectedLocationId) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const connect = async () => {
      try {
        const channel = await venueApi.subscribeEvents(selectedLocationId);
        if (cancelled) return;
        const subscription = channel.subscribe(() => void refresh());
        unsubscribe = () => subscription.unsubscribe();
        await subscription.established;
      } catch {
        // Pull-to-refresh remains available when realtime is unavailable.
      }
    };
    void connect();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [refresh, selectedLocationId]);

  const selectLocation = useCallback(
    (locationId: string) => setSelectedLocationId(locationId),
    []
  );
  const selectedLocation = useMemo(
    () =>
      locations.find((location) => location.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );
  const value = useMemo(
    () => ({
      board,
      error,
      loading,
      locations,
      refresh,
      refreshing,
      selectedLocation,
      selectedLocationId,
      selectLocation,
      workspace,
    }),
    [
      board,
      error,
      loading,
      locations,
      refresh,
      refreshing,
      selectedLocation,
      selectedLocationId,
      selectLocation,
      workspace,
    ]
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSyncWorkspace() {
  const context = useContext(Context);
  if (!context)
    throw new Error(
      "useSyncWorkspace must be used within SyncWorkspaceProvider"
    );
  return context;
}
