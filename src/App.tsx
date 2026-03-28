import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Delaunay } from 'd3-delaunay';
import { RefreshCw, Plus, Minus, Info, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Point {
  x: number;
  y: number;
  label: number;
  id: string;
}

const COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEEAD', // Yellow
  '#D4A5A5', // Pink
];

const WIDTH = 800;
const HEIGHT = 600;
const GRID_SIZE = 15; // Size of background grid cells for k-NN visualization

export default function App() {
  const [points, setPoints] = useState<Point[]>([]);
  const [k, setK] = useState(3);
  const [showVoronoi, setShowVoronoi] = useState(true);
  const [showKNN, setShowKNN] = useState(true);
  const [numClasses, setNumClasses] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize random points
  const generatePoints = useCallback((count: number, classes: number) => {
    const newPoints: Point[] = [];
    for (let i = 0; i < count; i++) {
      newPoints.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        label: Math.floor(Math.random() * classes),
        id: Math.random().toString(36).substr(2, 9),
      });
    }
    setPoints(newPoints);
  }, []);

  useEffect(() => {
    generatePoints(20, numClasses);
  }, [generatePoints, numClasses]);

  // Voronoi calculation
  const voronoi = useMemo(() => {
    if (points.length < 3) return null;
    const delaunay = Delaunay.from(points.map(p => [p.x, p.y]));
    return delaunay.voronoi([0, 0, WIDTH, HEIGHT]);
  }, [points]);

  // k-NN classification for a given point
  const classifyPoint = useCallback((x: number, y: number, kVal: number) => {
    if (points.length === 0) return -1;
    
    // Calculate distances to all points
    const distances = points.map(p => ({
      label: p.label,
      distSq: (p.x - x) ** 2 + (p.y - y) ** 2
    }));

    // Sort by distance
    distances.sort((a, b) => a.distSq - b.distSq);

    // Take top k
    const neighbors = distances.slice(0, Math.min(kVal, points.length));

    // Count labels
    const counts: Record<number, number> = {};
    neighbors.forEach(n => {
      counts[n.label] = (counts[n.label] || 0) + 1;
    });

    // Find majority label
    let maxCount = -1;
    let majorityLabel = -1;
    Object.entries(counts).forEach(([label, count]) => {
      if (count > maxCount) {
        maxCount = count;
        majorityLabel = parseInt(label);
      }
    });

    return majorityLabel;
  }, [points]);

  // Generate background grid for k-NN visualization
  const grid = useMemo(() => {
    if (!showKNN || points.length === 0) return [];
    const cells = [];
    for (let x = 0; x < WIDTH; x += GRID_SIZE) {
      for (let y = 0; y < HEIGHT; y += GRID_SIZE) {
        const label = classifyPoint(x + GRID_SIZE / 2, y + GRID_SIZE / 2, k);
        cells.push({ x, y, label });
      }
    }
    return cells;
  }, [showKNN, points, k, classifyPoint]);

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add point with random label
    setPoints(prev => [
      ...prev,
      {
        x,
        y,
        label: Math.floor(Math.random() * numClasses),
        id: Math.random().toString(36).substr(2, 9),
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-[#E4E3E0] font-sans selection:bg-[#E4E3E0] selection:text-[#141414]">
      {/* Header */}
      <header className="border-b border-[#E4E3E0]/20 p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase italic font-serif">
            Voronoi & k-NN Explorer
          </h1>
          <p className="text-xs opacity-50 font-mono mt-1">
            Spatial Clustering & Decision Boundaries Visualization
          </p>
        </div>
        <div className="flex gap-4 items-center font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="opacity-50 uppercase">Points:</span>
            <span>{points.length}</span>
          </div>
          <div className="h-4 w-[1px] bg-[#E4E3E0]/20" />
          <div className="flex items-center gap-2">
            <span className="opacity-50 uppercase">Classes:</span>
            <span>{numClasses}</span>
          </div>
        </div>
      </header>

      <main className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 max-w-7xl mx-auto">
        {/* Visualization Area */}
        <div className="relative aspect-[4/3] bg-[#0A0A0A] border border-[#E4E3E0]/20 rounded-sm overflow-hidden group cursor-crosshair">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            onClick={handleCanvasClick}
            className="w-full h-full"
          >
            {/* k-NN Background Grid */}
            {showKNN && grid.map((cell, i) => (
              <rect
                key={i}
                x={cell.x}
                y={cell.y}
                width={GRID_SIZE}
                height={GRID_SIZE}
                fill={COLORS[cell.label]}
                fillOpacity={0.15}
                stroke="none"
              />
            ))}

            {/* Voronoi Cells */}
            {showVoronoi && voronoi && points.map((p, i) => (
              <path
                key={p.id}
                d={voronoi.renderCell(i)}
                fill="none"
                stroke={COLORS[p.label]}
                strokeOpacity={0.3}
                strokeWidth={1}
              />
            ))}

            {/* Points */}
            {points.map((p) => (
              <g key={p.id}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={COLORS[p.label]}
                  className="transition-all duration-300"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={8}
                  fill="none"
                  stroke={COLORS[p.label]}
                  strokeOpacity={0.5}
                  className="animate-pulse"
                />
              </g>
            ))}
          </svg>

          {/* Overlay Info */}
          <div className="absolute bottom-4 left-4 bg-[#141414]/80 backdrop-blur-md border border-[#E4E3E0]/20 p-3 rounded-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest">
              <MousePointer2 size={12} />
              <span>Click to add test points</span>
            </div>
          </div>
        </div>

        {/* Controls Sidebar */}
        <aside className="space-y-8">
          {/* Parameter: K */}
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-[11px] font-serif italic uppercase opacity-50 tracking-widest">
                Number of Neighbors (k)
              </label>
              <span className="text-2xl font-mono font-bold">{k}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setK(prev => Math.max(1, prev - 1))}
                className="p-2 border border-[#E4E3E0]/20 hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors"
                disabled={k <= 1}
              >
                <Minus size={16} />
              </button>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={k}
                onChange={(e) => setK(parseInt(e.target.value))}
                className="flex-1 accent-[#E4E3E0]"
              />
              <button
                onClick={() => setK(prev => Math.min(15, prev + 1))}
                className="p-2 border border-[#E4E3E0]/20 hover:bg-[#E4E3E0] hover:text-[#141414] transition-colors"
                disabled={k >= 15}
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-[10px] font-mono opacity-40 leading-relaxed">
              k-NN classifies a point based on the majority label of its {k} nearest neighbors.
              When k=1, it matches the Voronoi tessellation exactly.
            </p>
          </section>

          <div className="h-[1px] bg-[#E4E3E0]/10" />

          {/* Visualization Toggles */}
          <section className="space-y-3">
            <label className="text-[11px] font-serif italic uppercase opacity-50 tracking-widest block mb-4">
              Layers
            </label>
            <button
              onClick={() => setShowVoronoi(!showVoronoi)}
              className={`w-full p-3 flex justify-between items-center border transition-all ${
                showVoronoi ? 'border-[#E4E3E0] bg-[#E4E3E0] text-[#141414]' : 'border-[#E4E3E0]/20 opacity-50 hover:opacity-100'
              }`}
            >
              <span className="text-xs font-mono uppercase tracking-tighter">Voronoi Cells</span>
              <div className={`w-2 h-2 rounded-full ${showVoronoi ? 'bg-[#141414]' : 'bg-[#E4E3E0]'}`} />
            </button>
            <button
              onClick={() => setShowKNN(!showKNN)}
              className={`w-full p-3 flex justify-between items-center border transition-all ${
                showKNN ? 'border-[#E4E3E0] bg-[#E4E3E0] text-[#141414]' : 'border-[#E4E3E0]/20 opacity-50 hover:opacity-100'
              }`}
            >
              <span className="text-xs font-mono uppercase tracking-tighter">k-NN Boundaries</span>
              <div className={`w-2 h-2 rounded-full ${showKNN ? 'bg-[#141414]' : 'bg-[#E4E3E0]'}`} />
            </button>
          </section>

          <div className="h-[1px] bg-[#E4E3E0]/10" />

          {/* Actions */}
          <section className="space-y-3">
             <label className="text-[11px] font-serif italic uppercase opacity-50 tracking-widest block mb-4">
              Data Controls
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setNumClasses(prev => Math.max(2, prev - 1))}
                className="p-2 text-[10px] font-mono border border-[#E4E3E0]/20 hover:bg-[#E4E3E0]/10 transition-colors uppercase"
              >
                Less Classes
              </button>
              <button
                onClick={() => setNumClasses(prev => Math.min(6, prev + 1))}
                className="p-2 text-[10px] font-mono border border-[#E4E3E0]/20 hover:bg-[#E4E3E0]/10 transition-colors uppercase"
              >
                More Classes
              </button>
            </div>
            <button
              onClick={() => generatePoints(20, numClasses)}
              className="w-full p-4 border border-[#E4E3E0] flex items-center justify-center gap-3 hover:bg-[#E4E3E0] hover:text-[#141414] transition-all group"
            >
              <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest">Regenerate Data</span>
            </button>
            <button
              onClick={() => setPoints([])}
              className="w-full p-2 text-[10px] font-mono opacity-50 hover:opacity-100 transition-opacity uppercase"
            >
              Clear All Points
            </button>
          </section>

          {/* Legend */}
          <section className="p-4 bg-[#E4E3E0]/5 border border-[#E4E3E0]/10 rounded-sm">
            <div className="flex items-start gap-3">
              <Info size={16} className="mt-0.5 opacity-50" />
              <div className="space-y-2">
                <p className="text-[10px] font-mono leading-relaxed opacity-70">
                  <span className="font-bold text-[#E4E3E0]">Voronoi:</span> Partitions the plane into regions close to each seed point.
                </p>
                <p className="text-[10px] font-mono leading-relaxed opacity-70">
                  <span className="font-bold text-[#E4E3E0]">k-NN:</span> The background color shows which class would be assigned to that location based on the majority of the nearest {k} points.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#E4E3E0]/10 p-8 text-center">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-[0.2em]">
          Computational Geometry Visualization &bull; v1.0.0
        </p>
      </footer>
    </div>
  );
}

