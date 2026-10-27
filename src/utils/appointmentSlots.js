export function generateAvailableHours(durationMinutes, occupiedSlots = [], startHour = 8, endHour = 18) {
  const duration = Number(durationMinutes);
  if (!Number.isFinite(duration) || duration <= 0) return [];

  const occupied = new Set(occupiedSlots);
  const slots = [];
  const start = startHour * 60;
  const end = endHour * 60;

  for (let minute = start; minute + duration <= end; minute += duration) {
    const hourText = String(Math.floor(minute / 60)).padStart(2, "0");
    const minuteText = String(minute % 60).padStart(2, "0");
    const slot = `${hourText}:${minuteText}`;
    if (!occupied.has(slot)) slots.push(slot);
  }
  return slots;
}
