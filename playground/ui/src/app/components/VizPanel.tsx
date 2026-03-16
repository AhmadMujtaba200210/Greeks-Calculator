import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AlertCircle, LoaderCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildComparisonSeries,
  buildGreeksSeries,
  buildPriceSeries,
  buildTimeDecaySeries,
  buildVolatilitySeries,
} from "@/lib/playground-series";
import { toEngineParams } from "@/lib/pricing-engine";
import type { PlaygroundComputed, PlaygroundParams, VizId } from "@/lib/types";
import { computeConvergenceDiagnostics } from "../../../../public/js/mcDiagnostics.js";

const Surface3DPanel = lazy(() => import("@/app/components/Surface3DPanel"));
const DiagnosticsPanel = lazy(() => import("@/app/components/DiagnosticsPanel"));

type VizPanelProps = {
  activeViz: VizId;
  computed: PlaygroundComputed | null;
  params: PlaygroundParams;
  isPending: boolean;
  onVizChange: (value: VizId) => void;
};

type ChartSummary = {
  headline: string;
  supporting: string;
};

function getDefaultSummary(activeViz: VizId): ChartSummary | null {
  if (activeViz === "price") {
    return { headline: "Price Curve", supporting: "Reprice against spot using the active engine." };
  }
  if (activeViz === "greeks") {
    return { headline: "Greek Response", supporting: "Delta, Gamma, and Vega stay visible together." };
  }
  if (activeViz === "volatility") {
    return { headline: "Volatility Surface Slice", supporting: "Quick smile proxy across strikes." };
  }
  if (activeViz === "time") {
    return { headline: "Time Decay", supporting: "Observe premium compression as expiry approaches." };
  }
  if (activeViz === "comparison") {
    return { headline: "Cross-Model View", supporting: "Compare relative pricing outputs side by side." };
  }
  if (activeViz === "convergence") {
    return { headline: "Convergence View", supporting: "Switch to Binomial or Monte Carlo to inspect convergence." };
  }
  if (activeViz === "diagnostics") {
    return { headline: "Diagnostics Console", supporting: "Inspect reference agreement, benchmark health, and engine trust context." };
  }
  return null;
}

function warningTone(severity: string) {
  if (severity === "critical") return "border-rose-200 bg-rose-50";
  if (severity === "warning") return "border-amber-200 bg-amber-50";
  return "border-sky-200 bg-sky-50";
}

function buildChartOptions(series: any, mode: "line" | "bar", isLogScale = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#475569",
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
        },
      },
      tooltip: {
        backgroundColor: "rgba(255,255,255,0.98)",
        borderColor: "#cbd5e1",
        borderWidth: 1,
        titleColor: "#0f172a",
        bodyColor: "#334155",
        displayColors: true,
      },
    },
    scales: {
      x: {
        type: isLogScale ? "logarithmic" : "category",
        title: series.xTitle
          ? {
              display: true,
              text: series.xTitle,
              color: "#64748b",
            }
          : undefined,
        ticks: {
          color: "#64748b",
        },
        grid: {
          color: "#e2e8f0",
        },
        reverse: series.reverseX ?? false,
      },
      y: {
        beginAtZero: mode === "bar",
        title: series.yTitle
          ? {
              display: true,
              text: series.yTitle,
              color: "#64748b",
            }
          : undefined,
        ticks: {
          color: "#64748b",
        },
        grid: {
          color: "#e2e8f0",
        },
      },
    },
  };
}

function buildConvergenceChart(diagnostics: any, model: PlaygroundParams["pricingModel"]) {
  if (model === "binomial") {
    return {
      type: "line" as const,
      data: {
        labels: diagnostics.binomial.map((entry: any) => entry.steps),
        datasets: [
          {
            label: "BS Reference",
            data: diagnostics.binomial.map(() => diagnostics.bsPrice),
            borderColor: "#2563eb",
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          },
          {
            label: "Binomial Price",
            data: diagnostics.binomial.map((entry: any) => entry.price),
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.12)",
            borderWidth: 2,
            pointRadius: 3,
            fill: false,
            tension: 0.2,
          },
        ],
      },
      options: buildChartOptions(
        {
          xTitle: "Tree Steps",
          yTitle: "Option Price ($)",
        },
        "line",
      ),
      summary: {
        headline: "Binomial Convergence",
        supporting: `Last price ${diagnostics.binomial.at(-1)?.price?.toFixed(4) ?? "--"} vs BS ${diagnostics.bsPrice.toFixed(4)}`,
      } satisfies ChartSummary,
    };
  }

  return {
    type: "line" as const,
    data: {
      datasets: [
        {
          label: "BS Reference",
          data: diagnostics.monteCarlo.map((entry: any) => ({ x: entry.paths, y: diagnostics.bsPrice })),
          borderColor: "#2563eb",
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          parsing: false,
        },
        {
          label: "MC Mean Price",
          data: diagnostics.monteCarlo.map((entry: any) => ({ x: entry.paths, y: entry.meanPrice })),
          borderColor: "#d97706",
          backgroundColor: "rgba(217,119,6,0.12)",
          borderWidth: 2,
          pointRadius: 4,
          fill: false,
          tension: 0.2,
          parsing: false,
        },
      ],
    },
    options: {
      ...buildChartOptions({ xTitle: "Paths", yTitle: "Option Price ($)" }, "line", true),
      scales: {
        x: {
          type: "logarithmic",
          title: {
            display: true,
            text: "Paths",
            color: "#64748b",
          },
          ticks: { color: "#64748b" },
          grid: { color: "#e2e8f0" },
        },
        y: {
          title: {
            display: true,
            text: "Option Price ($)",
            color: "#64748b",
          },
          ticks: { color: "#64748b" },
          grid: { color: "#e2e8f0" },
        },
      },
    },
    summary: {
      headline: "Monte Carlo Precision",
      supporting: `Estimated SE ${diagnostics.monteCarlo.at(-1)?.estimatedSE?.toFixed(4) ?? "--"} at ${diagnostics.monteCarlo.at(-1)?.paths?.toLocaleString() ?? "--"} paths`,
    } satisfies ChartSummary,
  };
}

function ChartCanvas({ activeViz, params, computed }: Omit<VizPanelProps, "onVizChange" | "isPending">) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ChartSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      if (!canvasRef.current) return;
      if (!window.Chart) {
        setError("Chart.js is unavailable in the current page.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setSummary(null);

      try {
        let config: any = null;

        if (activeViz === "price") {
          const series = await buildPriceSeries(params);
          config = {
            type: "line",
            data: { labels: series.labels, datasets: series.datasets },
            options: buildChartOptions(series, "line"),
          };
          setSummary({ headline: "Price Curve", supporting: "Reprice against spot using the active engine." });
        }

        if (activeViz === "greeks") {
          const series = await buildGreeksSeries(params);
          config = {
            type: "line",
            data: { labels: series.labels, datasets: series.datasets },
            options: buildChartOptions(series, "line"),
          };
          setSummary({ headline: "Greek Response", supporting: "Delta, Gamma, and Vega stay visible together." });
        }

        if (activeViz === "volatility") {
          const series = buildVolatilitySeries(params);
          config = {
            type: "line",
            data: { labels: series.labels, datasets: series.datasets },
            options: buildChartOptions(series, "line"),
          };
          setSummary({ headline: "Volatility Surface Slice", supporting: "Quick smile proxy across strikes." });
        }

        if (activeViz === "time") {
          const series = await buildTimeDecaySeries(params);
          config = {
            type: "line",
            data: { labels: series.labels, datasets: series.datasets },
            options: buildChartOptions(series, "line"),
          };
          setSummary({ headline: "Time Decay", supporting: "Observe premium compression as expiry approaches." });
        }

        if (activeViz === "comparison") {
          const series = buildComparisonSeries(computed?.comparison);
          config = {
            type: "bar",
            data: { labels: series.labels, datasets: series.datasets },
            options: buildChartOptions(series, "bar"),
          };
          setSummary({ headline: "Cross-Model View", supporting: "Compare relative pricing outputs side by side." });
        }

        if (activeViz === "convergence") {
          if (params.pricingModel !== "binomial" && params.pricingModel !== "monte_carlo") {
            setSummary({
              headline: "Convergence View",
              supporting: "Switch to Binomial or Monte Carlo to inspect convergence.",
            });
            setLoading(false);
            return;
          }

          const diagnostics = await computeConvergenceDiagnostics(toEngineParams(params));
          config = buildConvergenceChart(diagnostics, params.pricingModel);
          setSummary(config.summary);
        }

        if (cancelled || !config) return;

        if (chartRef.current?.destroy) {
          chartRef.current.destroy();
        }

        chartRef.current = new window.Chart(canvasRef.current, config);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Chart rendering failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderChart();

    return () => {
      cancelled = true;
      if (chartRef.current?.destroy) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [activeViz, params, computed]);

  return (
    <div className="space-y-2">
      {(summary ?? getDefaultSummary(activeViz)) && (
        <div className="pg-chart-summary flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-border/70 bg-white/85 px-3 py-2 shadow-sm">
          <div>
            <p className="text-[13px] font-semibold leading-none" data-testid="chart-summary-headline">{(summary ?? getDefaultSummary(activeViz)).headline}</p>
            <p className="mt-1 text-[12px] leading-[1.125rem] text-muted-foreground" data-testid="chart-summary-supporting">{(summary ?? getDefaultSummary(activeViz)).supporting}</p>
          </div>
          {activeViz === "convergence" && (
            <HoverCard openDelay={120}>
              <HoverCardTrigger asChild>
                <div>
                  <Badge variant="secondary">{params.pricingModel === "binomial" ? "Tree steps" : "Path count"}</Badge>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <p className="text-sm font-semibold">Convergence constraint</p>
                <p className="mt-2 text-sm text-slate-600">
                  Convergence is only meaningful for Binomial and Monte Carlo because the x-axis depends on step or path count.
                </p>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>
      )}

      {error ? (
        <Alert className="border-destructive/20 bg-rose-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Chart Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="relative h-[300px] rounded-[14px] border border-border bg-white/95 sm:h-[330px]">
          {loading && <Skeleton className="absolute inset-0" />}
          {activeViz === "convergence" && params.pricingModel !== "binomial" && params.pricingModel !== "monte_carlo" ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select Binomial or Monte Carlo to inspect convergence.
            </div>
          ) : (
            <canvas ref={canvasRef} className="h-full w-full" />
          )}
        </div>
      )}
    </div>
  );
}

export default function VizPanel({ activeViz, computed, params, isPending, onVizChange }: VizPanelProps) {
  const summary = getDefaultSummary(activeViz);

  return (
    <Card className="pg-panel shadow-sm" data-testid="playground-viz-card">
      <CardHeader className="gap-2.5 border-b border-border/70 p-3 pb-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <CardTitle className="text-sm">Analysis Desk</CardTitle>
              <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">{computed?.modelLabel ?? "Loading"}</Badge>
              <Badge variant="outline" className="px-2 py-0.5 text-[10px]">{activeViz === "surface3d" ? "3D" : activeViz === "diagnostics" ? "Diagnostics" : summary?.headline ?? "Chart"}</Badge>
            </div>
            <CardDescription className="text-xs leading-[1.125rem]">Switch views without resetting the contract.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HoverCard openDelay={120}>
              <HoverCardTrigger asChild>
                <div>
                  <Badge variant="outline" className="cursor-default px-2 py-0.5 text-[10px]">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    {activeViz === "convergence" && params.pricingModel !== "binomial" && params.pricingModel !== "monte_carlo"
                      ? "Needs Binomial / MC"
                      : "Live context"}
                  </Badge>
                </div>
              </HoverCardTrigger>
              <HoverCardContent>
                <p className="text-sm font-semibold">View context</p>
                <p className="mt-2 text-sm text-slate-600">
                  The chart desk reuses the same contract state across every view, so tab changes do not reset the pricing assumptions.
                </p>
              </HoverCardContent>
            </HoverCard>
            {isPending && (
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/45 px-2 py-0.5 text-[11px] text-muted-foreground">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Updating view
              </div>
            )}
          </div>
        </div>

        {computed?.warnings?.length ? (
          <div className="grid gap-1.5 lg:grid-cols-2">
            {computed.warnings.slice(0, 4).map((warning) => (
              <Alert key={`${warning.code}-${warning.message}`} className={warningTone(warning.severity)}>
                <AlertTitle>{warning.code.replaceAll("_", " ")}</AlertTitle>
                <AlertDescription>{warning.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="p-3 pt-2.5">
        <Tabs value={activeViz} onValueChange={(value) => onVizChange(value as VizId)}>
          <TabsList className="pg-tab-list-compact flex max-w-full overflow-x-auto bg-muted/45 flex-nowrap whitespace-nowrap">
            <TabsTrigger className="pg-tab-trigger-compact" value="price">Price</TabsTrigger>
            <TabsTrigger className="pg-tab-trigger-compact" value="greeks">Greeks</TabsTrigger>
            <TabsTrigger className="pg-tab-trigger-compact" value="volatility">Surface</TabsTrigger>
            <TabsTrigger className="pg-tab-trigger-compact" value="time">Time</TabsTrigger>
            <TabsTrigger className="pg-tab-trigger-compact" value="comparison">Cross-Model</TabsTrigger>
            <TabsTrigger className="pg-tab-trigger-compact" value="convergence">Convergence</TabsTrigger>
            <TabsTrigger className="pg-tab-trigger-compact" value="surface3d">3D</TabsTrigger>
            <TabsTrigger className="pg-tab-trigger-compact" value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-3" data-testid={`viz-${activeViz}`}>
          {activeViz === "surface3d" ? (
            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-[14px] sm:h-[330px]" />}>
              <Surface3DPanel params={params} />
            </Suspense>
          ) : activeViz === "diagnostics" ? (
            <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-[14px] sm:h-[330px]" />}>
              <DiagnosticsPanel comparison={computed?.comparison ?? null} />
            </Suspense>
          ) : (
            <ChartCanvas key={activeViz} activeViz={activeViz} computed={computed} params={params} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
