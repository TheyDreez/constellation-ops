"use client";
import { motion } from "framer-motion";
import { useTickets } from "@/hooks/useTickets";
import { useAuth } from "@/lib/auth-context";
import { calculateSLAMetrics } from "@/lib/sla-engine";
import { SkeletonDashboard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Header } from "@/components/layout/Header";
import { AlertTriangle } from "lucide-react";

import { StatusBar } from "@/components/dashboard/StatusBar";
import { HealthOrb } from "@/components/dashboard/HealthOrb";
import { OperationalRadar } from "@/components/dashboard/OperationalRadar";
import { SLAPulse } from "@/components/dashboard/SLAPulse";
import { WorkloadMatrix } from "@/components/dashboard/WorkloadMatrix";
import { CriticalZone } from "@/components/dashboard/CriticalZone";
import { ActivityStream } from "@/components/dashboard/ActivityStream";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { tickets, loading, error } = useTickets();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "";

  if (loading) {
    return (
      <>
        <Header />
        <div className="p-6">
          <SkeletonDashboard />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="p-6">
          <EmptyState icon={AlertTriangle} title="Não foi possível carregar o dashboard" description={error} />
        </div>
      </>
    );
  }

  const slaMetrics = calculateSLAMetrics(tickets);
  const active = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");

  // Score de saúde: cumprimento de SLA, penalizado por concentração de risco ativo
  const riskPenalty = active.length > 0 ? (slaMetrics.atRisk / active.length) * 25 : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(slaMetrics.compliancePercent - riskPenalty)));

  return (
    <>
      <Header />
      <div className="p-6">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          <motion.div variants={item}>
            <StatusBar
              firstName={firstName}
              totalActive={active.length}
              breached={slaMetrics.breached}
              atRisk={slaMetrics.atRisk}
            />
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <HealthOrb score={healthScore} breachedCount={slaMetrics.breached} atRiskCount={slaMetrics.atRisk} />
            </div>
            <div className="col-span-1">
              <OperationalRadar tickets={tickets} />
            </div>
            <div className="col-span-1">
              <SLAPulse tickets={tickets} />
            </div>
          </motion.div>

          <motion.div variants={item}>
            <WorkloadMatrix tickets={tickets} />
          </motion.div>

          <motion.div variants={item}>
            <CriticalZone tickets={tickets} />
          </motion.div>

          <motion.div variants={item}>
            <ActivityStream tickets={tickets} limit={8} />
          </motion.div>

          <motion.div variants={item}>
            <ActivityHeatmap tickets={tickets} />
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
