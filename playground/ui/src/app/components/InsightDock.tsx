import { Bot, BookOpenText, ChartSpline, Sparkles, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InsightTabId, PlaygroundComputed } from "@/lib/types";
import DerivationsAccordion from "@/app/components/DerivationsAccordion";
import HealthHoverCard from "@/app/components/HealthHoverCard";

type InsightDockProps = {
  computed: PlaygroundComputed;
  activeTab: InsightTabId;
  onTabChange: (tab: InsightTabId) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function badgeVariant(status: "pass" | "warn" | "fail") {
  if (status === "pass") return "success";
  if (status === "warn") return "warning";
  return "destructive";
}

function adviceTone(type: PlaygroundComputed["advice"] extends infer Advice ? Advice extends { type: infer T } ? T : never : never) {
  if (type === "danger") return "border-rose-200 bg-rose-50";
  if (type === "warning") return "border-amber-200 bg-amber-50";
  if (type === "success") return "border-emerald-200 bg-emerald-50";
  if (type === "info") return "border-sky-200 bg-sky-50";
  return "border-border bg-muted/35";
}

export default function InsightDock({ computed, activeTab, onTabChange }: InsightDockProps) {
  return (
    <Card className="pg-dock-panel shadow-sm" data-testid="playground-insight-dock">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2.5">
          <div>
            <CardTitle className="text-sm">Insight Dock</CardTitle>
            <CardDescription className="text-xs leading-[1.125rem]">Signals, validation, references, and math stay contextual.</CardDescription>
          </div>
          <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">Desk context</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as InsightTabId)}>
          <TabsList className="pg-tab-list-compact grid w-full max-w-full grid-cols-4">
            <TabsTrigger className="pg-tab-trigger-compact" value="signal">Signal</TabsTrigger>
            <TabsTrigger className="pg-tab-trigger-compact" value="validation">Validation</TabsTrigger>
            <TabsTrigger className="pg-tab-trigger-compact" value="reference">Reference</TabsTrigger>
            <TabsTrigger className="pg-tab-trigger-compact" value="math">Math</TabsTrigger>
          </TabsList>

          <TabsContent value="signal" className="mt-2.5">
            <div className="space-y-2.5" data-testid="playground-advice-card">
              <div className="rounded-[14px] border p-2.5 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Trader&apos;s Advice
                    </p>
                    <p className="text-[12px] leading-[1.125rem] text-muted-foreground">Desk interpretation of the contract.</p>
                  </div>
                  {computed.advice && <Badge variant={computed.advice.type === "success" ? "success" : computed.advice.type === "danger" ? "destructive" : computed.advice.type === "warning" ? "warning" : "secondary"}>{computed.advice.title}</Badge>}
                </div>
                <div className={`rounded-[12px] border p-2 ${adviceTone(computed.advice?.type ?? "neutral")}`}>
                  <p className="mb-1 text-sm font-semibold">{computed.advice?.title ?? "Waiting for signal"}</p>
                  <p className="text-[12px] leading-[1.125rem] text-slate-700">{computed.advice?.text ?? "Advice appears after the first price pass."}</p>
                </div>
              </div>

              {computed.surrogateSummary && (
                <div className="rounded-[14px] border border-border bg-white p-2.5 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">AI Surrogate Domain Check</p>
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={computed.surrogateSummary.recommendation === "trustworthy" ? "success" : computed.surrogateSummary.recommendation === "caution" ? "warning" : "destructive"}>
                      {computed.surrogateSummary.recommendation}
                    </Badge>
                    <span className="pg-metric-value text-sm text-muted-foreground">
                      {(computed.surrogateSummary.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <p className="text-[12px] leading-[1.125rem] text-muted-foreground">{computed.surrogateSummary.message}</p>
                </div>
              )}

              <div className="rounded-[14px] border border-border bg-white p-2.5 shadow-sm" data-testid="playground-quickfacts-card">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <TimerReset className="h-4 w-4 text-primary" />
                      Quick Facts
                    </p>
                    <p className="text-[12px] leading-[1.125rem] text-muted-foreground">Compact context for the contract.</p>
                  </div>
                  <span className="pg-metric-value text-[13px]">{computed.moneynessPct.toFixed(1)}%</span>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                      <span>Moneyness bar</span>
                      <span>{computed.moneynessPct.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.max(0, Math.min(100, ((computed.moneynessPct / 100 - 0.8) / 0.4) * 100))} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>OTM</span>
                      <span>ATM</span>
                      <span>ITM</span>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    {computed.quickFacts.map((fact) => (
                      <div key={fact.label} className="rounded-[12px] border border-border bg-slate-50/70 p-2">
                        <p className="mb-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{fact.label}</p>
                        <p className="pg-metric-value text-sm font-semibold">{fact.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="validation" className="mt-2.5">
            <div className="space-y-2.5" data-testid="playground-validation-card">
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                <HealthHoverCard
                  label="Domain"
                  status={computed.health.domain}
                  description="Domain warnings reflect edge cases, surrogate trust, and parameter validity."
                  compact
                />
                <HealthHoverCard
                  label="Stability"
                  status={computed.health.stability}
                  description="Stability checks how closely the active engine aligns with the Black-Scholes anchor."
                  compact
                />
                <HealthHoverCard
                  label="Overall"
                  status={computed.health.overall}
                  description="Overall combines warnings and cross-model agreement into one summary signal."
                  compact
                />
              </div>

              <div className="rounded-[14px] border border-border bg-white p-2.5 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <ChartSpline className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Validation Table</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {computed.validationRows.map((row) => (
                      <TableRow key={row.model}>
                        <TableCell>{row.model}</TableCell>
                        <TableCell className="pg-metric-value">{formatCurrency(row.price)}</TableCell>
                        <TableCell>
                          {row.errorPct === null ? (
                            <span className="text-muted-foreground">Ref</span>
                          ) : (
                            <Badge variant={badgeVariant(row.status)}>{row.errorPct.toFixed(2)}%</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reference" className="mt-2.5" data-testid="playground-references-card">
            <div className="rounded-[14px] border border-border bg-white shadow-sm">
              <div className="border-b border-border px-3 py-2">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <BookOpenText className="h-4 w-4 text-primary" />
                  References
                </p>
                <p className="text-[12px] leading-[1.125rem] text-muted-foreground">Methodology and implementation context for the active engine.</p>
              </div>
              <ScrollArea className="h-[280px] p-2.5">
                <div className="space-y-2.5 pr-2">
                  {computed.citations.map((citation, index) => (
                    <div key={citation.key} className="rounded-[12px] border border-border bg-slate-50/70 p-2">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="secondary">{index + 1}</Badge>
                        <p className="text-sm font-semibold">{citation.method}</p>
                      </div>
                      {citation.primary && <p className="text-[12px] leading-[1.125rem] text-slate-700">{citation.primary}</p>}
                      {citation.secondary && <p className="mt-1 text-[12px] leading-[1.125rem] text-muted-foreground">{citation.secondary}</p>}
                      {citation.textbook && <p className="mt-1.5 text-[12px] leading-[1.125rem] text-slate-700">{citation.textbook}</p>}
                      {citation.implementationNote && <p className="mt-1.5 text-[12px] leading-[1.125rem] text-muted-foreground">{citation.implementationNote}</p>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="math" className="mt-2.5">
            <div className="rounded-[14px] border border-border bg-white p-2.5 shadow-sm">
              <div className="mb-2">
                <p className="text-sm font-semibold">Mathematical Derivations</p>
                <p className="text-[12px] leading-[1.125rem] text-muted-foreground">Keep formula details close, but out of the way until needed.</p>
              </div>
              <DerivationsAccordion />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
