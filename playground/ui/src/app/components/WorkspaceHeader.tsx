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
  return (
    <div className="pg-shell-strip space-y-3" data-testid="playground-workspace-header">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
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
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{params.optionType.toUpperCase()}</Badge>
            <Badge variant="outline">Spot {params.spot.toFixed(0)}</Badge>
            <Badge variant="outline">Strike {params.strike.toFixed(0)}</Badge>
            <Badge variant="outline">{formatDays(params.maturity)}</Badge>
            <Badge variant="secondary">{computed?.modelLabel ?? "Pricing engine"}</Badge>
            {activePreset && <Badge variant="default">Preset active</Badge>}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
          <Button variant="outline" size="sm" className="h-8 lg:hidden" onClick={onOpenControls} data-testid="playground-controls-sheet-trigger">
            <PanelLeftOpen className="h-4 w-4" />
            Controls
          </Button>
          <ScenarioPresetMenu onSelect={onApplyPreset} />
          <WorkspaceActions onReset={onReset} onVizChange={onVizChange} onInsightTabChange={onInsightTabChange} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <HealthHoverCard
          label="Domain"
          status={computed?.health.domain ?? "warn"}
          description="Domain reflects warnings, model assumptions, and whether the current parameter set is trustworthy for the selected engine."
        />
        <HealthHoverCard
          label="Stability"
          status={computed?.health.stability ?? "warn"}
          description="Stability checks how closely the active engine agrees with the cross-model reference stack."
        />
        <HealthHoverCard
          label="Overall"
          status={computed?.health.overall ?? "warn"}
          description="Overall combines domain validity and cross-model stability into a single desk-level signal."
        />
      </div>
    </div>
  );
}
