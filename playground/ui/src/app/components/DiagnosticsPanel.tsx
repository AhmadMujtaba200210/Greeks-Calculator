import { useMemo, useState } from "react";
import { Activity, ShieldCheck, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ComparisonPayload } from "@/lib/types";
import { runHealthCheck } from "../../../../public/js/validation.js";

type DiagnosticsPanelProps = {
  comparison: ComparisonPayload | null;
};

type BenchmarkReport = {
  totalCases: number;
  results: Array<{
    caseId: string;
    description: string;
    models: Record<string, "pass" | "warning" | "fail">;
  }>;
  summary: Record<string, { pass: number; warning: number; fail: number }>;
};

function toBadgeVariant(status: "pass" | "warning" | "fail") {
  if (status === "pass") return "success";
  if (status === "warning") return "warning";
  return "destructive";
}

export default function DiagnosticsPanel({ comparison }: DiagnosticsPanelProps) {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metricRows = useMemo(() => {
    if (!comparison?.reference) return [];
    const metrics: Array<keyof typeof comparison.reference> = ["price", "delta", "gamma", "vega", "theta", "rho"];
    return metrics.map((metric) => ({
      metric,
      reference: comparison.reference?.[metric] as number,
      models: comparison.models.map((model) => ({
        name: model.name,
        value: model.result?.[metric as keyof typeof model.result] as number,
        errorPct:
          metric === "price" && Number.isFinite(model.errors?.price?.relative)
            ? ((model.errors?.price?.relative as number) * 100)
            : null,
      })),
    }));
  }, [comparison]);

  async function handleRunHealthCheck() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/benchmarks.json");
      if (!response.ok) throw new Error("`benchmarks.json` could not be loaded.");
      const payload = await response.json();
      setReport(runHealthCheck(payload));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Health check failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="playground-diagnostics">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Cross-Model Diagnostics
            </CardTitle>
            <CardDescription>Inspect the full reference stack without leaving the Playground.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!comparison?.reference ? (
              <Alert>
                <AlertTitle>Diagnostics unavailable</AlertTitle>
                <AlertDescription>Reference pricing data is not ready yet.</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {comparison.models.map((model) => (
                    <Badge
                      key={model.name}
                      variant={toBadgeVariant(
                        model.overallStatus === "warning" ? "warning" : (model.overallStatus as "pass" | "fail"),
                      )}
                    >
                      {model.name}
                    </Badge>
                  ))}
                </div>
                <ScrollArea className="h-[260px] rounded-lg border border-border">
                  <div className="min-w-[720px] p-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead>BS Ref</TableHead>
                          {comparison.models.map((model) => (
                            <TableHead key={model.name}>{model.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metricRows.map((row) => (
                          <TableRow key={row.metric}>
                            <TableCell className="font-medium uppercase tracking-[0.12em] text-muted-foreground">
                              {row.metric}
                            </TableCell>
                            <TableCell className="pg-metric-value">{row.reference.toFixed(4)}</TableCell>
                            {row.models.map((model) => (
                              <TableCell key={`${row.metric}-${model.name}`}>
                                <div className="space-y-1">
                                  <div className="pg-metric-value">{model.value.toFixed(4)}</div>
                                  {model.errorPct !== null && (
                                    <div className="text-xs text-muted-foreground">Price err {model.errorPct.toFixed(2)}%</div>
                                  )}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Benchmark Health Check
            </CardTitle>
            <CardDescription>Run the benchmark pack from `benchmarks.json` against the current engines.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="secondary" className="w-full" onClick={handleRunHealthCheck} disabled={loading}>
              {loading ? "Running checks..." : "Run Full Health Check"}
            </Button>
            {error && (
              <Alert className="border-destructive/20 bg-rose-50">
                <AlertTitle>Health Check Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {report ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(report.summary).map(([key, stats]) => {
                    const tone = stats.fail > 0 ? "destructive" : stats.warning > 0 ? "warning" : "success";
                    return (
                      <Card key={key} className="rounded-lg">
                        <CardContent className="p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-semibold capitalize">{key}</p>
                            <Badge variant={tone as "success" | "warning" | "destructive"}>{stats.fail > 0 ? "Attention" : "Healthy"}</Badge>
                          </div>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between"><span>Pass</span><span className="pg-metric-value text-emerald-700">{stats.pass}</span></div>
                            <div className="flex items-center justify-between"><span>Warn</span><span className="pg-metric-value text-amber-700">{stats.warning}</span></div>
                            <div className="flex items-center justify-between"><span>Fail</span><span className="pg-metric-value text-rose-700">{stats.fail}</span></div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <Separator />
                <ScrollArea className="h-[180px] rounded-lg border border-border">
                  <div className="p-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Case</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.results.slice(0, 10).map((result) => {
                          const hasFail = Object.values(result.models).includes("fail");
                          const hasWarn = Object.values(result.models).includes("warning");
                          return (
                            <TableRow key={result.caseId}>
                              <TableCell className="pg-metric-value">{result.caseId}</TableCell>
                              <TableCell>{result.description}</TableCell>
                              <TableCell>
                                <Badge variant={hasFail ? "destructive" : hasWarn ? "warning" : "success"}>
                                  {hasFail ? "Fail" : hasWarn ? "Warn" : "Pass"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Benchmark coverage stays optional until you run it.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <TriangleAlert className="h-4 w-4 text-amber-600" />
        <AlertTitle>Interpretation Note</AlertTitle>
        <AlertDescription>
          Cross-model agreement is a sanity check, not a guarantee. Monte Carlo and AI outputs need context from domain and sampling error.
        </AlertDescription>
      </Alert>
    </div>
  );
}
