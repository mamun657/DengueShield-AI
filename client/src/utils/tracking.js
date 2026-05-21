const getTimestamp = (value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const normalizeSymptoms = (symptoms) => {
  if (Array.isArray(symptoms)) return symptoms;
  if (symptoms == null) return [];
  return [String(symptoms)];
};

export const normalizeTrackingRecords = (records = [], limit = 3) => {
  const items = Array.isArray(records) ? records : [];
  const byDay = new Map();
  const withoutDay = [];

  items.forEach((record) => {
    const dayRaw = record?.dayOfIllness ?? record?.day;
    const dayValue = Number(dayRaw);
    const day = Number.isFinite(dayValue) && dayValue > 0 ? dayValue : null;

    const dateValue = record?.date || record?.updatedAt || record?.createdAt || null;
    const timestamp = getTimestamp(dateValue) ?? 0;

    const riskRaw = record?.riskScore ?? record?.risk_score ?? record?.computed?.riskScore ?? record?.risk;
    const riskValue = Number(riskRaw);
    const riskScore = Number.isFinite(riskValue) ? riskValue : null;

    const tempRaw = record?.temperature ?? record?.temp ?? record?.temperatureC;
    const tempValue = Number(tempRaw);
    const temperature = Number.isFinite(tempValue) ? tempValue : null;

    const fluidRaw = record?.fluidIntakeLiters ?? record?.fluid ?? record?.hydration;
    const fluidValue = Number(fluidRaw);
    const fluidIntakeLiters = Number.isFinite(fluidValue) ? fluidValue : null;

    const normalized = {
      date: dateValue,
      temperature,
      riskScore,
      risk_score: riskScore,
      fluidIntakeLiters,
      dayOfIllness: day,
      symptoms: normalizeSymptoms(record?.symptoms),
      _timestamp: timestamp,
    };

    if (day == null) {
      withoutDay.push(normalized);
      return;
    }

    const existing = byDay.get(day);
    if (!existing || normalized._timestamp >= (existing._timestamp ?? 0)) {
      byDay.set(day, normalized);
    }
  });

  const deduped = [...byDay.values(), ...withoutDay]
    .filter((item) => item.date || item.dayOfIllness != null);

  deduped.sort((a, b) => {
    const dayA = Number.isFinite(a.dayOfIllness) ? a.dayOfIllness : Number.POSITIVE_INFINITY;
    const dayB = Number.isFinite(b.dayOfIllness) ? b.dayOfIllness : Number.POSITIVE_INFINITY;
    if (dayA !== dayB) return dayA - dayB;
    return (a._timestamp ?? 0) - (b._timestamp ?? 0);
  });

  const takeCount = Number.isFinite(limit) && limit > 0 ? limit : deduped.length;
  const latest = deduped.slice(-takeCount);

  return latest.map(({ _timestamp, ...rest }) => rest);
};
