import { startTransition, useDeferredValue, useEffect, useState } from "react";
import PlaygroundShell from "@/app/layout/PlaygroundShell";
import ControlRail from "@/app/components/ControlRail";
import InsightDock from "@/app/components/InsightDock";
import ScenarioPresetMenu, { SCENARIO_PRESETS } from "@/app/components/ScenarioPresetMenu";
import SummaryBand from "@/app/components/SummaryBand";
import VizPanel from "@/app/components/VizPanel";
import WorkspaceHeader from "@/app/components/WorkspaceHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPlaygroundComputed } from "@/lib/playground-mappers";
import { ensurePricingEngine, priceOption } from "@/lib/pricing-engine";
import type {
  PlaygroundComputed,
  PlaygroundParams,
  PlaygroundUiState,
  ScenarioPresetId,
  VizId,
} from "@/lib/types";

const defaults: PlaygroundParams = {
  optionType: "call",
  pricingModel: "black_scholes",
  spot: 100,
  strike: 100,
  maturity: 1,
  volatility: 0.25,
  rate: 0.05,
  dividend: 0,
};

const defaultUiState: PlaygroundUiState = {
  activeViz: "price",
  activeInsightTab: "signal",
  activePreset: null,
  mobileControlsOpen: false,
};

function LoadingMainPane() {
  return (
    <div className="space-y-4">
      <Card className="pg-panel shadow-sm">
        <CardContent className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <Skeleton className="h-36 rounded-[24px]" />
          <Skeleton className="h-36 rounded-[24px]" />
          <Skeleton className="h-36 rounded-[24px]" />
          <Skeleton className="h-36 rounded-[24px]" />
        </CardContent>
      </Card>
      <Card className="pg-panel shadow-sm">
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-12 rounded-[20px]" />
          <Skeleton className="h-[420px] rounded-[24px]" />
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingDock() {
  return (
    <Card className="pg-dock-panel shadow-sm">
      <CardContent className="space-y-4 p-5">
        <Skeleton className="h-10 rounded-[20px]" />
        <Skeleton className="h-32 rounded-[24px]" />
        <Skeleton className="h-40 rounded-[24px]" />
      </CardContent>
    </Card>
  );
}

export default function PlaygroundApp() {
  const [params, setParams] = useState<PlaygroundParams>(defaults);
  const deferredParams = useDeferredValue(params);
  const [uiState, setUiState] = useState<PlaygroundUiState>(defaultUiState);
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [computed, setComputed] = useState<PlaygroundComputed | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    ensurePricingEngine()
      .then(() => {
        if (!cancelled) setEngineReady(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setEngineReady(true);
          setEngineError(error instanceof Error ? error.message : "Pricing engine could not be initialized.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!engineReady) return;
    let cancelled = false;
    setIsPending(true);

    priceOption(deferredParams)
      .then((execution) => {
        if (!cancelled) {
          setComputed(buildPlaygroundComputed(deferredParams, execution));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setEngineError(error instanceof Error ? error.message : "The pricing workflow failed.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deferredParams, engineReady]);

  function clearActivePreset() {
    setUiState((current) => ({ ...current, activePreset: null }));
  }

  function updateNumericParam(key: keyof PlaygroundParams, value: number) {
    clearActivePreset();
    setParams((current) => ({ ...current, [key]: value }));
  }

  function updatePricingModel(value: PlaygroundParams["pricingModel"]) {
    clearActivePreset();
    setParams((current) => ({ ...current, pricingModel: value }));
  }

  function updateOptionType(value: PlaygroundParams["optionType"]) {
    clearActivePreset();
    setParams((current) => ({ ...current, optionType: value }));
  }

  function resetParams() {
    setParams(defaults);
    setUiState((current) => ({ ...defaultUiState, activeViz: current.activeViz === "diagnostics" ? "price" : current.activeViz }));
  }

  function applyPreset(presetId: ScenarioPresetId) {
    const preset = SCENARIO_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    setParams((current) => preset.apply(current));
    setUiState((current) => ({ ...current, activePreset: presetId }));
  }

  function updateViz(value: VizId) {
    startTransition(() => {
      setUiState((current) => ({ ...current, activeViz: value }));
    });
  }

  function updateInsightTab(value: PlaygroundUiState["activeInsightTab"]) {
    setUiState((current) => ({ ...current, activeInsightTab: value }));
  }

  function setMobileControlsOpen(open: boolean) {
    setUiState((current) => ({ ...current, mobileControlsOpen: open }));
  }

  const header = (
    <WorkspaceHeader
      params={params}
      computed={computed}
      activePreset={uiState.activePreset}
      onApplyPreset={applyPreset}
      onReset={resetParams}
      onVizChange={updateViz}
      onInsightTabChange={updateInsightTab}
      onOpenControls={() => setMobileControlsOpen(true)}
    />
  );

  const controlPane = (
    <ControlRail
      params={params}
      computed={computed}
      onReset={resetParams}
      onPricingModelChange={updatePricingModel}
      onOptionTypeChange={updateOptionType}
      onNumericParamChange={updateNumericParam}
    />
  );

  const mainPane = computed ? (
    <div className="space-y-4">
      {engineError && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTitle>Runtime Notice</AlertTitle>
          <AlertDescription>{engineError}</AlertDescription>
        </Alert>
      )}
      <SummaryBand computed={computed} params={params} />
      <VizPanel activeViz={uiState.activeViz} computed={computed} params={params} isPending={isPending} onVizChange={updateViz} />
    </div>
  ) : (
    <LoadingMainPane />
  );

  const insightPane = computed ? (
    <InsightDock computed={computed} activeTab={uiState.activeInsightTab} onTabChange={updateInsightTab} />
  ) : (
    <LoadingDock />
  );

  return (
    <PlaygroundShell
      header={header}
      controlPane={controlPane}
      mainPane={mainPane}
      insightPane={insightPane}
      mobileControlsOpen={uiState.mobileControlsOpen}
      onMobileControlsOpenChange={setMobileControlsOpen}
    />
  );
}
