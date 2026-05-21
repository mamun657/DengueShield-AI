import { useEffect, useMemo, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";

const GROUP_COLORS = {
  Symptom: "#22d3ee",
  WHO_Warning: "#fbbf24",
  Risk: "#f87171",
  Action: "#60a5fa",
  Severity: "#a78bfa",
  Recommendation: "#34d399",
  Hospital: "#94a3b8",
};

const GraphVisualization = ({ graphData, width = 520, height = 360, highlightIds = [] }) => {
  const ref = useRef();

  const data = useMemo(() => {
    const nodes = (graphData?.nodes || []).map((n) => ({
      ...n,
      color: GROUP_COLORS[n.group] || "#64748b",
      val: highlightIds.some((h) => n.graphId === h || n.id?.includes(h)) ? 3 : 1.2,
    }));
    const links = (graphData?.links || []).map((l) => ({
      ...l,
      color: "rgba(34, 211, 238, 0.35)",
    }));
    return { nodes, links };
  }, [graphData, highlightIds]);

  useEffect(() => {
    if (!ref.current || !data.nodes.length) return;
    ref.current.d3Force("charge")?.strength(-120);
    ref.current.d3Force("link")?.distance(70);
  }, [data]);

  if (!data.nodes.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-cyan-300/20 bg-black/30 text-sm text-slate-500"
        style={{ width, height }}
      >
        Run analysis to visualize clinical pathways
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-cyan-300/25 bg-[#060d18] shadow-[inset_0_0_40px_rgba(34,211,238,0.06)]"
      style={{ width: "100%", maxWidth: width }}
    >
      <ForceGraph2D
        ref={ref}
        graphData={data}
        width={width}
        height={height}
        backgroundColor="rgba(6, 13, 24, 0)"
        nodeLabel={(n) => `${n.group}: ${n.label}`}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.label || node.id;
          const fontSize = 11 / globalScale;
          const r = 5 * (node.val || 1);
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color;
          ctx.fill();
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
          ctx.fillText(label.length > 18 ? `${label.slice(0, 16)}…` : label, node.x, node.y + r + 8);
        }}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => "rgba(56, 189, 248, 0.8)"}
        linkWidth={1.2}
      />
    </div>
  );
};

export default GraphVisualization;
