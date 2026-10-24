import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { METRICS } from "../service.js";

const CLUSTER_SEATS = [
  [1, 0],
  [-1, 0],
  [0.72, -0.72],
  [-0.72, 0.72],
  [0.72, 0.72],
  [-0.72, -0.72]
];

function createClusterIcon(row, scale, shownMetrics) {
  const parts = METRICS.filter((m) => shownMetrics[m.k] && (row.per[m.k] || 0) > 0);

  if (!parts.length) {
    return L.divIcon({
      className: "vclu",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      html: '<svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#F4F6F9" stroke="#C7D2DE" stroke-dasharray="3,3"/></svg>'
    });
  }

  const rad = parts.map((m) => 4 + 10 * Math.sqrt((row.per[m.k] || 0) / (scale || 1)));
  const maxRad = Math.max(...rad);
  const ring = maxRad * 1.05;
  const box = Math.ceil((ring + maxRad) * 2) + 4;
  const c = box / 2;

  const circles = parts.map((m, i) => {
    const seat = CLUSTER_SEATS[i % CLUSTER_SEATS.length];
    const x = parts.length === 1 ? c : c + seat[0] * ring;
    const y = parts.length === 1 ? c : c + seat[1] * ring;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad[i].toFixed(1)}" fill="${m.c}" fill-opacity="0.85" stroke="#ffffff" stroke-width="1.5"><title>${m.l}: ${row.per[m.k]}</title></circle>`;
  }).join("");

  return L.divIcon({
    className: "vclu",
    iconSize: [box, box],
    iconAnchor: [c, c],
    html: `<svg width="${box}" height="${box}">${circles}</svg>`
  });
}

export default function SupervisorMap({
  volunteers,
  geoData,
  district = "Nagarkurnool",
  mapView = "district",
  shownMetrics
}) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const districtLayerRef = useRef(null);
  const bubbleLayerRef = useRef(null);
  const [legendInfo, setLegendInfo] = useState({ scale: 1, surveyed: 0, quiet: 0, total: 0 });

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainer.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
        zoomSnap: 0
      });
    }

    const map = mapRef.current;
    const geo = geoData || (typeof window !== "undefined" ? window.OH_SUP_GEO : null);

    if (!geo || !geo.districts) return;

    // Draw District Boundary
    const features = (geo.districts.features || []).filter(
      (f) => (f.properties?.district || "").toLowerCase() === (district || "").toLowerCase()
    );

    if (districtLayerRef.current) {
      map.removeLayer(districtLayerRef.current);
    }

    if (features.length > 0) {
      districtLayerRef.current = L.geoJSON(
        { type: "FeatureCollection", features },
        {
          style: {
            color: "#A34A66",
            weight: 2,
            fillColor: "#B85C78",
            fillOpacity: 0.06
          },
          interactive: false
        }
      ).addTo(map);
      districtLayerRef.current.bringToBack();
    }

    // Roll up volunteers by village
    const byVillage = {};
    const activeMetrics = METRICS.filter((m) => shownMetrics[m.k]);

    (volunteers || []).forEach((v) => {
      const villageName = v.village || v.panchayat || v.block || "Unknown";
      const key = `${v.district || district}|${villageName}`;

      if (!byVillage[key]) {
        // Point from gazetteer or block fallback
        let pt = geo.villages?.[key] || null;
        if (!pt && geo.blocks?.[`${v.district || district}|${v.block}`]) {
          const bp = geo.blocks[`${v.district || district}|${v.block}`];
          pt = { lat: bp.lat, lng: bp.lng, src: "block", block: v.block };
        }

        byVillage[key] = {
          name: villageName,
          block: v.block || "",
          vols: 0,
          recs: 0,
          per: {},
          pt
        };
      }

      byVillage[key].vols += 1;
      const recsCount = activeMetrics.reduce((sum, m) => sum + (v.activity?.[m.k] || 0), 0);
      byVillage[key].recs += recsCount;

      METRICS.forEach((m) => {
        byVillage[key].per[m.k] = (byVillage[key].per[m.k] || 0) + (v.activity?.[m.k] || 0);
      });
    });

    const rows = Object.values(byVillage).filter((r) => r.pt && r.pt.lat && r.pt.lng);

    // Compute max single activity value across visible metrics to scale bubbles
    let maxScale = 1;
    rows.forEach((r) => {
      METRICS.forEach((m) => {
        if (shownMetrics[m.k]) {
          maxScale = Math.max(maxScale, r.per[m.k] || 0);
        }
      });
    });

    if (bubbleLayerRef.current) {
      map.removeLayer(bubbleLayerRef.current);
    }

    bubbleLayerRef.current = L.layerGroup().addTo(map);

    rows
      .slice()
      .sort((a, b) => b.recs - a.recs)
      .forEach((r) => {
        const breakdown = METRICS.filter((m) => shownMetrics[m.k] && r.per[m.k])
          .map((m) => `<span style="color:${m.c}">●</span> ${m.l}: <b>${r.per[m.k]}</b>`)
          .join("<br/>");

        const provenance =
          r.pt.src === "gazetteer"
            ? "Surveyed position"
            : `Indicative position · within ${r.pt.block || r.block} mandal`;

        const tooltipHtml = `
          <div style="font-size:12px; line-height:1.45;">
            <b>${r.name}</b><br/>
            ${r.vols} volunteer${r.vols === 1 ? "" : "s"} · ${r.recs} record${r.recs === 1 ? "" : "s"}<br/>
            ${breakdown ? breakdown : "<i>Nothing reported</i>"}<br/>
            <span style="opacity:0.65; font-size:11px;">${provenance}</span>
          </div>
        `;

        L.marker([r.pt.lat, r.pt.lng], {
          icon: createClusterIcon(r, maxScale, shownMetrics),
          riseOnHover: true
        })
          .bindTooltip(tooltipHtml, { direction: "top", offset: [0, -6] })
          .addTo(bubbleLayerRef.current);
      });

    // Update legend statistics
    const surveyedCount = rows.filter((r) => r.pt?.src === "gazetteer").length;
    const quietCount = rows.filter((r) => r.recs <= 0).length;
    setLegendInfo({
      scale: maxScale,
      surveyed: surveyedCount,
      quiet: quietCount,
      total: rows.length
    });

    // Fit map bounds
    const applyFit = () => {
      map.invalidateSize();
      try {
        if (mapView === "district" && districtLayerRef.current) {
          map.fitBounds(districtLayerRef.current.getBounds(), { padding: [18, 18] });
        } else if (rows.length > 0) {
          const latLngs = rows.map((r) => [r.pt.lat, r.pt.lng]);
          map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 14 });
        }
      } catch (err) {
        // Safe catch if bounds not ready
      }
    };

    applyFit();
    const timer = setTimeout(applyFit, 300);

    return () => clearTimeout(timer);
  }, [volunteers, geoData, district, mapView, shownMetrics]);

  return (
    <div className="mapcol" role="region" aria-label="Geographic activity coverage">
      <div id="sup-map" ref={mapContainer} className="sup-map-canvas" />

      {/* Map Legend */}
      <div className="maplegend" id="map-legend">
        <span className="lg-grp">
          <b>Circle size</b>
          <span className="lg-sizes">
            <i style={{ width: 8, height: 8 }} />
            <i style={{ width: 14, height: 14 }} />
            <i style={{ width: 22, height: 22 }} />
          </span>
          <span>records per activity, up to {legendInfo.scale}</span>
        </span>

        {legendInfo.quiet > 0 && (
          <span className="lg-grp">
            <i
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "1px dashed #C7D2DE",
                background: "#F4F6F9",
                display: "inline-block"
              }}
            />
            <span>{legendInfo.quiet} with nothing reported</span>
          </span>
        )}

        <span className="lg-note">
          One cluster per village; each circle is an activity in its chart color.{" "}
          {legendInfo.total === 0
            ? "No village coordinates recorded yet for this team."
            : legendInfo.surveyed === legendInfo.total
            ? `All ${legendInfo.total} village positions are surveyed.`
            : `${legendInfo.surveyed} of ${legendInfo.total} village positions are surveyed; remainder placed within mandal.`}
        </span>
      </div>
    </div>
  );
}
