import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

type PlaygroundShellProps = {
  header: ReactNode;
  controlPane: ReactNode;
  mainPane: ReactNode;
  insightPane: ReactNode;
  mobileControlsOpen: boolean;
  onMobileControlsOpenChange: (open: boolean) => void;
};

type ViewportMode = "mobile" | "stacked" | "desktop-2col" | "desktop-3col";

function getViewportMode(width: number): ViewportMode {
  if (width < 768) return "mobile";
  if (width < 1280) return "stacked";
  if (width < 1680) return "desktop-2col";
  return "desktop-3col";
}

export default function PlaygroundShell({
  header,
  controlPane,
  mainPane,
  insightPane,
  mobileControlsOpen,
  onMobileControlsOpenChange,
}: PlaygroundShellProps) {
  const [viewportMode, setViewportMode] = useState<ViewportMode>(() => {
    if (typeof window === "undefined") return "desktop-2col";
    return getViewportMode(window.innerWidth);
  });

  useEffect(() => {
    function handleResize() {
      setViewportMode(getViewportMode(window.innerWidth));
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className="pg-workspace p-2 sm:p-3 lg:p-3.5"
      data-testid="playground-dashboard"
      data-layout-mode={viewportMode}
      data-density="compact"
    >
      <div className="space-y-2.5">
        {header}

        {viewportMode === "desktop-3col" ? (
          <div className="pg-board rounded-[20px] border border-border/60">
            <ResizablePanelGroup direction="horizontal" className="h-auto min-h-[900px]">
              <ResizablePanel defaultSize={22} minSize={18}>
                <div className="p-2">{controlPane}</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={52} minSize={38}>
                <div className="p-2 pr-1.5">{mainPane}</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={26} minSize={20}>
                <div className="p-2 pl-1.5" data-testid="playground-right-pane">{insightPane}</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ) : viewportMode === "desktop-2col" ? (
          <div className="pg-board rounded-[20px] border border-border/60 p-2">
            <div className="grid gap-2.5 xl:grid-cols-[288px_minmax(0,1fr)]">
              <div>{controlPane}</div>
              <div className="space-y-2.5" data-testid="playground-analysis-stack">
                {mainPane}
                <div data-testid="playground-below-chart-dock">{insightPane}</div>
              </div>
            </div>
          </div>
        ) : viewportMode === "stacked" ? (
          <div className="space-y-2.5">
            {mainPane}
            <Accordion type="single" collapsible defaultValue="" className="pg-panel overflow-hidden rounded-[14px] border border-border/70 bg-white/90 shadow-sm" data-testid="playground-stacked-inputs">
              <AccordionItem value="inputs" className="border-b-0">
                <AccordionTrigger className="px-3 py-3 text-left hover:no-underline">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    Inputs
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-0">
                  {controlPane}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {insightPane}
          </div>
        ) : (
          <div className="space-y-2.5">
            {mainPane}
            {insightPane}
            <Sheet open={mobileControlsOpen} onOpenChange={onMobileControlsOpenChange}>
              <SheetContent side="right" className="overflow-y-auto p-0">
                <SheetHeader className="border-b border-border px-5 py-4">
                  <SheetTitle>Scenario Rail</SheetTitle>
                  <SheetDescription>Adjust contract and model inputs without leaving the chart.</SheetDescription>
                </SheetHeader>
                <div className="p-3">{controlPane}</div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </div>
  );
}
