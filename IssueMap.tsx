import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Issue } from '../types';
import { DEPARTMENT_COLORS, simplifiedStatus } from '../types';

interface Props {
  issues: Issue[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export default function IssueMap({ issues, center = [17.72, 83.3], zoom = 12, height = '480px' }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);
    markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const issue of issues) {
      if (issue.lat == null || issue.lng == null) continue;
      const color = DEPARTMENT_COLORS[issue.department] ?? '#808080';
      const marker = L.circleMarker([issue.lat, issue.lng], {
        radius: 8,
        color: 'white',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      });
      const simple = simplifiedStatus(issue.status);
      marker.bindPopup(
        `<strong>${escapeHtml(issue.issue_type)}</strong><br>` +
        `<strong>ID:</strong> ${escapeHtml(issue.id)}<br>` +
        `<strong>Location:</strong> ${escapeHtml(issue.location)}<br>` +
        `<strong>Status:</strong> ${escapeHtml(issue.status)}<br>` +
        `<strong>Indicator:</strong> ${simple === 'Resolved' ? '✓ Resolved' : issue.flag === 'Red' ? '🚩 Unsolved' : '○ Under Consideration'}`
      );
      marker.addTo(layer);
    }
    map.invalidateSize();
  }, [issues]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') mapRef.current?.invalidateSize();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: 12, zIndex: 0 }} />;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
