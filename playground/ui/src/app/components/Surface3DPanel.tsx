import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { buildSurfaceGrid } from "@/lib/playground-series";
import type { PlaygroundParams } from "@/lib/types";

type Surface3DPanelProps = {
  params: PlaygroundParams;
};

export default function Surface3DPanel({ params }: Surface3DPanelProps) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderSurface() {
      if (!plotRef.current) return;

      if (!window.Plotly) {
        setError("Plotly is unavailable in the current page.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const grid = await buildSurfaceGrid(params);
        if (cancelled || !plotRef.current) return;

        await window.Plotly.newPlot(
          plotRef.current,
          [
            {
              x: grid.x,
              y: grid.y,
              z: grid.z,
              type: "surface",
              colorscale: "Blues",
              showscale: true,
              hovertemplate:
                "Spot %{x:.2f}<br>Maturity %{y:.2f}y<br>IV %{z:.2f}%<extra></extra>",
            },
          ],
          {
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            margin: { l: 0, r: 0, t: 8, b: 0 },
            scene: {
              xaxis: { title: "Spot", color: "#334155", gridcolor: "#e2e8f0" },
              yaxis: { title: "Maturity", color: "#334155", gridcolor: "#e2e8f0" },
              zaxis: { title: "Implied Vol (%)", color: "#334155", gridcolor: "#e2e8f0" },
              camera: { eye: { x: 1.45, y: 1.4, z: 1.1 } },
            },
          },
          { responsive: true, displaylogo: false },
        );
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Failed to render the 3D surface.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    renderSurface();

    return () => {
      cancelled = true;
      if (window.Plotly && plotRef.current) {
        window.Plotly.purge(plotRef.current);
      }
    };
  }, [params]);

  if (error) {
    return (
      <Alert className="border-destructive/20 bg-rose-50">
        <AlertTitle>3D Surface Unavailable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-lg border border-border bg-white" data-testid="playground-surface3d">
      {loading && <Skeleton className="absolute inset-0" />}
      <div ref={plotRef} className="h-full w-full" />
    </div>
  );
}
