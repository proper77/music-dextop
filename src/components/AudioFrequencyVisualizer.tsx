import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

interface AudioFrequencyVisualizerProps {
  audioLevel: number;
  isPlaying: boolean;
  accentColor: string;
  trackId?: string;
  width?: number;
  height?: number;
  className?: string;
}

const BIN_COUNT = 24;

export function AudioFrequencyVisualizer({
  audioLevel,
  isPlaying,
  accentColor,
  trackId = 'default',
  width = 148,
  height = 34,
  className = '',
}: AudioFrequencyVisualizerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const levelRef = useRef(audioLevel);
  const playingRef = useRef(isPlaying);
  const accentRef = useRef(accentColor);
  const seedRef = useRef(0);

  levelRef.current = audioLevel;
  playingRef.current = isPlaying;
  accentRef.current = accentColor;
  seedRef.current = trackId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    // Subtle glow filter active when audio is playing
    const defs = svg.append('defs');
    const filter = defs
      .append('filter')
      .attr('id', 'bc-freq-glow')
      .attr('x', '-25%')
      .attr('y', '-25%')
      .attr('width', '150%')
      .attr('height', '150%');
    filter
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', '1.8')
      .attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const indices = d3.range(BIN_COUNT);
    const xScale = d3
      .scaleBand<number>()
      .domain(indices)
      .range([0, width])
      .paddingInner(0.32)
      .paddingOuter(0.05);

    const yScale = d3.scaleLinear().domain([0, 1]).range([0, height - 2]);

    const barValues = new Array<number>(BIN_COUNT).fill(0.06);
    const group = svg.append('g');
    const rects = group
      .selectAll('rect')
      .data(indices)
      .join('rect')
      .attr('x', (d) => xScale(d) ?? 0)
      .attr('width', xScale.bandwidth())
      .attr('rx', 1.5)
      .attr('ry', 1.5)
      .attr('y', height - 2)
      .attr('height', 2);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let phase = 0;

    const renderFrame = () => {
      const level = levelRef.current;
      const playing = playingRef.current;
      const accent = accentRef.current || '#fa586a';
      const seed = seedRef.current;
      const colorScale = d3.interpolateRgb(accent, '#f8fafc');

      if (!prefersReducedMotion) {
        phase += playing ? 0.14 : 0.02;
      }

      const breathOpacity =
        playing && !prefersReducedMotion
          ? 0.84 + 0.16 * (0.5 + 0.5 * Math.sin(phase * 0.45))
          : playing
            ? 0.92
            : 0.42;

      group
        .attr('opacity', breathOpacity.toFixed(3))
        .attr('filter', playing ? 'url(#bc-freq-glow)' : null);

      for (let i = 0; i < BIN_COUNT; i++) {
        const norm = i / (BIN_COUNT - 1);
        const envelope = 1 - Math.pow(norm - 0.25, 2) * 0.75;
        const harmonic =
          0.55 +
          0.45 *
            Math.sin(phase * (1.2 + (i % 5) * 0.31) + i * 0.65 + (seed % 11));
        const target = playing
          ? Math.max(0.08, Math.min(1, level * envelope * (0.45 + harmonic * 0.85)))
          : 0.06;

        barValues[i] = barValues[i] + (target - barValues[i]) * (prefersReducedMotion ? 1 : 0.28);
      }

      rects
        .attr('y', (d) => height - Math.max(2, yScale(barValues[d])))
        .attr('height', (d) => Math.max(2, yScale(barValues[d])))
        .attr('fill', (d) => colorScale(0.15 + (d / BIN_COUNT) * 0.55))
        .attr('fill-opacity', (d) => (playing ? 0.58 + barValues[d] * 0.42 : 0.3));

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [width, height]);

  return (
    <div
      className={`flex items-center transition-[opacity,filter] duration-300 ${className}`}
      style={{
        opacity: isPlaying ? 1 : 0.5,
        filter: isPlaying ? `drop-shadow(0 0 8px ${accentColor}55)` : 'none',
      }}
      data-playing={isPlaying ? 'true' : 'false'}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="shrink-0 overflow-visible"
        role="img"
        aria-label="Real-time D3 audio frequency visualizer"
      />
    </div>
  );
}
