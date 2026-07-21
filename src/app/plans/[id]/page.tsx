"use client";

import { use } from "react";
import { PlanDetailView } from "@/components/plan-detail";

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PlanDetailView planId={Number(id)} />;
}
