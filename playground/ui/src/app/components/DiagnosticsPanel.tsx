import { useMemo, useState } from "react";
import { Activity, ShieldCheck, TriangleAlert } from "lucide-react";
import benchmarkPayload from "../../../../../benchmarks.json";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { runBenchmarkSuite } from "@/lib/pricing-engine";
import type { BenchmarkReport, ComparisonPayload } from "@/lib/types";

type DiagnosticsPanelProps = {
  comparison: ComparisonPayload | null;
};

function toBadgeVariant(status: "pass" | "warn" | "fail") {
  if (status === "pass") return "success";
  if (status === "warn") return "warning";
  return "destructive";
}

function benchmarkVariant(status: "pass" | "warning" | "fail") {
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
        error:
          metric in model.errors
            ? model.errors[metric as keyof typeof model.errors]
            : null,
        diagnostics: model.diagnostics,
      })),
    }));
  }, [comparison]);

  async function handleRunHealthCheck() {
    setLoading(true);
    setError(null);

    try {
      setReport(await runBenchmarkSuite(benchmarkPayload));
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
            <CardDescription>Reference all production-facing models against the analytical baseline.</CardDescription>
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
                    <Badge key={model.name} variant={toBadgeVariant(model.overallStatus)}>
                      {model.name}
                    </Badge>
                  ))}
                </div>
                <ScrollArea className="h-[260px] rounded-lg border border-border">
                  <div className="min-w-[760px] p-3">
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
                                  {model.error && (
                                    <div className="text-xs text-muted-foreground">
                                      {(model.error.relative * 100).toFixed(2)}% err
                                    </div>
                                  )}
                                  {row.metric === "price" && model.diagnostics.ci95 && (
                                    <div className="text-xs text-muted-foreground">
                                      95% CI {model.diagnostics.ci95[0].toFixed(2)} to {model.diagnostics.ci95[1].toFixed(2)}
                                    </div>
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
            <CardDescription>Run the bundled benchmark pack through the Rust engine stack.</CardDescription>
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
                            <p className="text-sm font-semibold capitalize">{key.replaceAll("_", " ")}</p>
                            <Badge variant={tone as "success" | "warning" | "destructive"}>
                              {stats.fail > 0 ? "Attention" : stats.warning > 0 ? "Review" : "Healthy"}
                            </Badge>
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
                          <TableHead>Black-Scholes</TableHead>
                          <TableHead>Binomial</TableHead>
                          <TableHead>Monte Carlo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.results.slice(0, 10).map((result) => (
                          <TableRow key={result.case_id}>
                            <TableCell className="pg-metric-value">{result.case_id}</TableCell>
                            <TableCell>{result.description}</TableCell>
                            <TableCell><Badge variant={benchmarkVariant(result.models.black_scholes)}>{result.models.black_scholes}</Badge></TableCell>
                            <TableCell><Badge variant={benchmarkVariant(result.models.binomial)}>{result.models.binomial}</Badge></TableCell>
                            <TableCell><Badge variant={benchmarkVariant(result.models.monte_carlo)}>{result.models.monte_carlo}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Benchmark coverage is bundled, but only runs when you request it.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <TriangleAlert className="h-4 w-4 text-amber-600" />
        <AlertTitle>Interpretation Note</AlertTitle>
        <AlertDescription>
          Cross-model agreement is a sanity check, not a trading guarantee. Simulation views must be read together with their confidence interval and assumptions.
        </AlertDescription>
      </Alert>
    </div>
  );
}
