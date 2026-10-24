import React, { useRef, useState } from "react";
import SupervisorMap from "./SupervisorMap.jsx";
import VolunteerPerformanceChart from "./VolunteerPerformanceChart.jsx";
import VolunteerListingModal from "./VolunteerListingModal.jsx";
import { exportVolunteersCSV, METRICS } from "../service.js";

export default function DataMapSection({
  profile,
  volunteers,
  geoData,
  shownMetrics,
  onToggleMetric
}) {
  const [mapView, setMapView] = useState("district"); // "district" | "team"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const chartRef = useRef(null);

  const p = profile || {};
  const teamLength = (volunteers || []).length;

  const handleExcelExport = () => {
    const activeMetricsList = METRICS.filter((m) => shownMetrics[m.k]);
    exportVolunteersCSV(volunteers, activeMetricsList, `volunteer-performance-${p.block || "team"}.csv`);
  };

  const handleImageExport = () => {
    if (chartRef.current?.exportImage) {
      chartRef.current.exportImage(`volunteer-chart-${p.block || "team"}.png`);
    }
  };

  return (
    <section id="sec-map" className="sup-view" aria-label="Data Map and Activity Breakdown">
      <div className="map-h">
        <div className="sup-view-h" style={{ margin: 0 }}>
          <h2>
            Data Map
            <span id="map-sub" className="scope-inline">
              {[p.block, p.district, p.state || "Telangana"].filter(Boolean).join(" · ")}
            </span>
          </h2>
        </div>

        <div className="vh-actions">
          {/* Map extent toggle: District vs My area */}
          <div className="mapview" id="map-view" role="group" aria-label="Map extent">
            <button
              type="button"
              className={mapView === "district" ? "on" : ""}
              onClick={() => setMapView("district")}
            >
              District
            </button>
            <button
              type="button"
              className={mapView === "team" ? "on" : ""}
              onClick={() => setMapView("team")}
            >
              My area
            </button>
          </div>

          <button
            type="button"
            className="fbtn"
            id="v-more"
            onClick={() => setIsModalOpen(true)}
          >
            📋 View more
          </button>
          <button
            type="button"
            className="fbtn"
            id="v-xlsx"
            onClick={handleExcelExport}
          >
            📥 Excel
          </button>
          <button
            type="button"
            className="fbtn"
            id="v-img"
            onClick={handleImageExport}
          >
            🖼️ Image
          </button>
        </div>
      </div>

      {/* Scope line chips */}
      <div className="sup-filters" id="scope-line">
        <span className="scope-pill">
          <b>{p.title || "Supervisor"}</b> · {p.pillarLabel || "Environment"}
        </span>
        <span className="scope-pill">
          {p.block} · {p.district} · {p.state || "Telangana"}
        </span>
        <span className="scope-pill">
          {teamLength} {teamLength === 1 ? "volunteer" : "volunteers"}
        </span>
      </div>

      {/* Split view: Map on left, Stacked Horizontal Bar Chart on right */}
      <div className="mapsplit">
        <SupervisorMap
          volunteers={volunteers}
          geoData={geoData}
          district={p.district || "Nagarkurnool"}
          mapView={mapView}
          shownMetrics={shownMetrics}
        />

        <VolunteerPerformanceChart
          ref={chartRef}
          volunteers={volunteers}
          shownMetrics={shownMetrics}
          onToggleMetric={onToggleMetric}
        />
      </div>

      {/* Full listing modal */}
      <VolunteerListingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        volunteers={volunteers}
        shownMetrics={shownMetrics}
      />
    </section>
  );
}
