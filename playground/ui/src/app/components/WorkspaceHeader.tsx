import { PanelLeftOpen } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InsightTabId, PlaygroundComputed, PlaygroundParams, ScenarioPresetId, VizId } from "@/lib/types";
import ScenarioPresetMenu from "@/app/components/ScenarioPresetMenu";
import WorkspaceActions from "@/app/components/WorkspaceActions";
import HealthHoverCard from "@/app/components/HealthHoverCard";

type WorkspaceHeaderProps = {
  params: PlaygroundParams;
  computed: PlaygroundComputed | null;
  activePreset: ScenarioPresetId | null;
  onApplyPreset: (preset: ScenarioPresetId) => void;
  onReset: () => void;
  onVizChange: (viz: VizId) => void;
  onInsightTabChange: (tab: InsightTabId) => void;
  onOpenControls: () => void;
};

function formatDays(maturity: number) {
  return `${Math.max(1, Math.round(maturity * 365))}D`;
}

export default function WorkspaceHeader({
  params,
  computed,
  activePreset,
  onApplyPreset,
  onReset,
  onVizChange,
  onInsightTabChange,
  onOpenControls,
}: WorkspaceHeaderProps) {
  const compactSummary = `${params.optionType.toUpperCase()} · Spot ${params.spot.toFixed(0)} · Strike ${params.strike.toFixed(0)} · ${formatDays(params.maturity)} · ${computed?.modelLabel ?? "Pricing engine"}`;

  return (
    <div className="pg-shell-strip space-y-2" data-testid="playground-workspace-header">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0 flex-1 space-y-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <span className="text-muted-foreground">Workspace</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Playground</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="text-[11px] leading-[1.125rem] text-slate-300 sm:hidden">
            {params.optionType.toUpperCase()} · {computed?.modelLabel ?? "Pricing engine"}
          </div>
          <div className="hidden text-[11px] leading-[1.125rem] text-slate-300 md:block xl:hidden">
            {compactSummary}
          </div>
          <div className="hidden flex-wrap items-center gap-1.5 xl:flex">
            <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">{params.optionType.toUpperCase()}</Badge>
            <Badge variant="outline" className="px-2 py-0.5 text-[10px]">Spot {params.spot.toFixed(0)}</Badge>
            <Badge variant="outline" className="px-2 py-0.5 text-[10px]">Strike {params.strike.toFixed(0)}</Badge>
            <Badge variant="outline" className="px-2 py-0.5 text-[10px]">{formatDays(params.maturity)}</Badge>
            <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">{computed?.modelLabel ?? "Pricing engine"}</Badge>
            {activePreset && <Badge variant="default" className="px-2 py-0.5 text-[10px]">Preset active</Badge>}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <Button variant="outline" size="sm" className="h-8 md:hidden" onClick={onOpenControls} data-testid="playground-controls-sheet-trigger">
            <PanelLeftOpen className="h-4 w-4" />
            Controls
          </Button>
          <div className="hidden items-center gap-2 sm:flex">
            <ScenarioPresetMenu onSelect={onApplyPreset} />
            <WorkspaceActions onReset={onReset} onVizChange={onVizChange} onInsightTabChange={onInsightTabChange} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <HealthHoverCard
          label="Domain"
          status={computed?.health.domain ?? "warn"}
          description="Domain reflects warnings, model assumptions, and whether the current parameter set is trustworthy for the selected engine."
          compact
        />
        <HealthHoverCard
          label="Stability"
          status={computed?.health.stability ?? "warn"}
          description="Stability checks how closely the active engine agrees with the cross-model reference stack."
          compact
        />
        <HealthHoverCard
          label="Overall"
          status={computed?.health.overall ?? "warn"}
          description="Overall combines domain validity and cross-model stability into a single desk-level signal."
          compact
        />
      </div>
    </div>
  );
}
