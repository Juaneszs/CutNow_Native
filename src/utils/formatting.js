export function formatPrice(value) {
  return `$${Number(value || 0).toLocaleString("es-CO")}`;
}

export function formatDate(date, options = {
  weekday: "long",
  day: "numeric",
  month: "long",
}) {
  return new Intl.DateTimeFormat("es-CO", options).format(date);
}

export function formatAppointmentDateTime(cita) {
  const date = parseAppointmentDate(cita);
  return date ? formatDate(date, { dateStyle: "long" }) : cita.fecha;
}

export function parseAppointmentDate(cita) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(cita.fecha || ""));
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(cita.hora || ""));
  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch.map(Number);
  const [, hour, minute] = timeMatch.map(Number);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59) return null;

  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;
  return date;
}
