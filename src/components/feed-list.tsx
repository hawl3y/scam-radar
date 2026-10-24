"use client";

import { useEffect, useSyncExternalStore } from "react";
import { markFeedVisited } from "@/app/feed-actions";
import { ClusterCard } from "@/components/cluster-card";
import type { ClusterSummary } from "@/lib/clusters";

const STORAGE_KEY = "scam-radar:last-feed-visit";

// Signed-out visitors: the previous visit time from this browser, read once per
// visit to the feed (before we overwrite it with now).
let storedPrevious: string | null | undefined;
function readStoredPrevious(): string | null {
  if (storedPrevious === undefined) {
    try {
      storedPrevious = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      storedPrevious = null;
    }
  }
  return storedPrevious;
}
const noopSubscribe = () => () => {};

type Props = {
  clusters: ClusterSummary[];
  viewerZip: string;
  query: string;
  signedIn: boolean;
  serverLastVisit: string | null;
};

export function FeedList({ clusters, viewerZip, query, signedIn, serverLastVisit }: Props) {
  const localPrevious = useSyncExternalStore(noopSubscribe, readStoredPrevious, () => null);
  const previous = signedIn ? serverLastVisit : localPrevious;

  useEffect(() => {
    if (signedIn) {
      void markFeedVisited();
    } else {
      try {
        window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      } catch {
        // Storage blocked (private mode): "new" labels just won't persist.
      }
    }
    return () => {
      storedPrevious = undefined;
    };
  }, [signedIn]);

  // First visit: nothing is "new" yet.
  const previousMs = previous ? Date.parse(previous) : Number.NaN;
  const isNew = (c: ClusterSummary) => Number.isFinite(previousMs) && Date.parse(c.last_seen) > previousMs;
  const newCount = clusters.filter(isNew).length;

  return (
    <>
      {newCount > 0 && (
        <p role="status" className="rounded-md border-2 border-accent p-4 font-bold">
          {newCount === 1 ? "1 new scam" : `${newCount} new scams`} near you since your last visit.
        </p>
      )}
      <ul className="space-y-4">
        {clusters.map((cluster) => (
          <ClusterCard
            key={cluster.cluster_id}
            cluster={cluster}
            viewerZip={viewerZip}
            href={`/alerts/${cluster.cluster_id}${query}`}
            isNew={isNew(cluster)}
          />
        ))}
      </ul>
    </>
  );
}
