function normLevel(v) {
  if (v == null) return 'Low';
  const s = String(v).toLowerCase();
  if (['critical','crit','p1','sev1','4'].includes(s)) return 'Critical';
  if (['high','p2','sev2','3'].includes(s)) return 'High';
  if (['medium','med','p3','sev3','2'].includes(s)) return 'Medium';
  if (['low','p4','sev4','1'].includes(s)) return 'Low';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function mapThreat(raw = {}) {
  return {
    id: raw.id ?? raw._id ?? raw.threatId ?? String(raw.id ?? raw._id ?? raw.threatId ?? ''),
    ip: raw.ip ?? raw.ip_address ?? raw.sourceIp ?? raw.srcIp ?? '',
    level: normLevel(raw.level ?? raw.severity ?? raw.priority),
    source: raw.source ?? raw.detector ?? raw.engine ?? raw.module ?? 'Unknown',
    detectedAt: raw.detectedAt ?? raw.detected_at ?? raw.timestamp ?? raw.time ?? raw.createdAt ?? new Date().toISOString(),
    status: raw.status ?? raw.state ?? 'Open',
  };
}

export function mapAudit(raw = {}) {
  return {
    id: raw.id ?? raw._id ?? raw.eventId ?? String(raw.id ?? raw._id ?? raw.eventId ?? ''),
    actor: raw.actor ?? raw.user ?? raw.principal ?? 'system',
    action: raw.action ?? raw.event ?? raw.type ?? 'event',
    target: raw.target ?? raw.subject ?? raw.resource ?? '-',
    at: raw.at ?? raw.timestamp ?? raw.time ?? raw.createdAt ?? new Date().toISOString(),
    details: raw.details ?? raw.note ?? raw.message ?? '',
  };
}
