import { useEffect, useState, type ReactNode } from "react";
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
      className="pg-workspace p-2.5 sm:p-3.5 lg:p-4"
      data-testid="playground-dashboard"
      data-layout-mode={viewportMode}
      data-density="compact"
    >
      <div className="space-y-3">
        {header}

        {viewportMode === "desktop-3col" ? (
          <div className="pg-board rounded-[24px] border border-border/60">
            <ResizablePanelGroup direction="horizontal" className="h-auto min-h-[980px]">
              <ResizablePanel defaultSize={22} minSize={18}>
                <div className="p-2.5">{controlPane}</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={52} minSize={38}>
                <div className="p-2.5 pr-1.5">{mainPane}</div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={26} minSize={20}>
                <div className="p-2.5 pl-1.5" data-testid="playground-right-pane">{insightPane}</div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ) : viewportMode === "desktop-2col" ? (
          <div className="pg-board rounded-[24px] border border-border/60 p-2.5">
            <div className="grid gap-3 xl:grid-cols-[304px_minmax(0,1fr)]">
              <div>{controlPane}</div>
              <div className="space-y-3" data-testid="playground-analysis-stack">
                {mainPane}
                <div data-testid="playground-below-chart-dock">{insightPane}</div>
              </div>
            </div>
          </div>
        ) : viewportMode === "stacked" ? (
          <div className="space-y-3">
            {controlPane}
            {mainPane}
            {insightPane}
          </div>
        ) : (
          <div className="space-y-3">
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
