import React, { useEffect, useImperativeHandle, useRef } from "react";
import * as echarts from "echarts";
import { METRICS } from "../service.js";

// Stacking order from left (closest to Y-axis) to right (outermost bar)
const STACK_ORDER = [
  { k: "attended", l: "Trainings attended", c: "#E0B341" },
  { k: "imparted", l: "Trainings imparted", c: "#8B7EC4" },
  { k: "awareness", l: "Awareness", c: "#D18F6F" },
  { k: "samples", l: "Sample support", c: "#7FA88C" },
  { k: "referrals", l: "Referrals", c: "#B85C78" },
  { k: "events", l: "Events", c: "#5B8BB8" }
];

const VolunteerPerformanceChart = React.forwardRef(function VolunteerPerformanceChart(
  { volunteers, shownMetrics, onToggleMetric },
  ref
) {
  const chartEl = useRef(null);
  const chartInstance = useRef(null);

  // Expose exportImage method to parent
  useImperativeHandle(ref, () => ({
    exportImage: (filename = "cohv-volunteer-performance.png") => {
      if (!chartInstance.current) return;
      const url = chartInstance.current.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: "#ffffff"
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }));

  // Calculate totals based on currently active metrics
  const activeMetricsList = METRICS.filter((m) => shownMetrics[m.k]);
  const calcTotal = (v) => activeMetricsList.reduce((acc, m) => acc + (v.activity?.[m.k] || 0), 0);

  // Sort volunteers descending by active totals, capped to 12
  const ranked = (volunteers || [])
    .slice()
    .sort((a, b) => calcTotal(b) - calcTotal(a))
    .slice(0, 12);

  const categories = ranked.map((v) => v.name);

  useEffect(() => {
    if (!chartEl.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartEl.current, null, { renderer: "canvas" });
    }

    const chart = chartInstance.current;

    // Filter stack order to only those shown
    const activeStack = STACK_ORDER.filter((item) => shownMetrics[item.k]);
    const lastActiveKey = activeStack.length > 0 ? activeStack[activeStack.length - 1].k : null;

    const series = activeStack.map((item) => {
      const isOutermost = item.k === lastActiveKey;
      return {
        name: item.l,
        type: "bar",
        stack: "total",
        barWidth: 20,
        itemStyle: {
          color: item.c,
          borderRadius: isOutermost ? [0, 4, 4, 0] : [0, 0, 0, 0]
        },
        data: ranked.map((v) => v.activity?.[item.k] || 0)
      };
    });

    const option = {
      animationDuration: 300,
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        borderColor: "transparent",
        textStyle: { color: "#ffffff", fontSize: 12 },
        formatter: (params) => {
          return `<b>${params.name}</b><br/>${params.seriesName}: <b>${params.value}</b>`;
        }
      },
      grid: {
        top: 20,
        bottom: 24,
        left: 175,
        right: 25,
        containLabel: false
      },
      xAxis: {
        type: "value",
        min: 0,
        max: 50,
        interval: 10,
        splitLine: {
          show: true,
          lineStyle: {
            color: "#e2e8f0",
            width: 1
          }
        },
        axisLine: {
          show: false
        },
        axisTick: {
          show: true,
          lineStyle: { color: "#94a3b8" }
        },
        axisLabel: {
          color: "#475569",
          fontSize: 12,
          fontFamily: "Inter, sans-serif"
        }
      },
      yAxis: {
        type: "category",
        inverse: true, // Top category is busiest volunteer
        data: categories,
        axisLine: {
          show: true,
          lineStyle: { color: "#1e293b", width: 1.5 }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: "#1e293b",
          fontSize: 11.5,
          fontWeight: 500,
          fontFamily: "Inter, sans-serif",
          margin: 14,
          formatter: (value) => {
            return value.length > 20 ? value.slice(0, 19) + "…" : value;
          }
        }
      },
      series
    };

    chart.setOption(option, true);

    const handleResize = () => chart && chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [volunteers, shownMetrics, ranked, categories]);

  // Legend display order as in prototype / screenshot
  const LEGEND_ITEMS = [
    { k: "events", l: "Events", c: "#5B8BB8" },
    { k: "referrals", l: "Referrals", c: "#B85C78" },
    { k: "samples", l: "Sample support", c: "#7FA88C" },
    { k: "awareness", l: "Awareness", c: "#D18F6F" },
    { k: "imparted", l: "Trainings imparted", c: "#8B7EC4" },
    { k: "attended", l: "Trainings attended", c: "#E0B341" }
  ];

  return (
    <div className="sup-chart-card" role="region" aria-label="Volunteer performance chart">
      <div className="sup-chart-header">
        <span className="ch-ttl">Volunteer Activity Breakdown</span>
      </div>

      <div ref={chartEl} className="sup-chart-canvas" />

      {/* Interactive Legend directly below chart matching screenshot */}
      <div className="chart-interactive-legend" role="group" aria-label="Filter activity series">
        {LEGEND_ITEMS.map((item) => {
          const isOn = shownMetrics[item.k];
          return (
            <button
              type="button"
              key={item.k}
              className={`chart-legend-chip${isOn ? "" : " off"}`}
              onClick={() => onToggleMetric(item.k)}
              title={isOn ? `Click to hide ${item.l}` : `Click to show ${item.l}`}
            >
              <span className="dot" style={{ backgroundColor: item.c }} aria-hidden="true" />
              <span>{item.l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default VolunteerPerformanceChart;
