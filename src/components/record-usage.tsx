"use client";

import { useEffect } from "react";
import { recordClientUsage } from "@/app/usage-actions";
import type { UsageMetric } from "@/lib/usage-metrics";

export function RecordUsage({ metrics }: { metrics: UsageMetric[] }) {
  const key = metrics.join(",");
  useEffect(() => {
    for (const metric of key.split(",")) if (metric) void recordClientUsage(metric as UsageMetric);
  }, [key]);
  return null;
}
