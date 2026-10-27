import AdminCrud from "./AdminCrud";
import { formatPrice } from "../../utils/formatting";

const fields = [
  { name: "NomCorte", label: "Nombre del servicio", type: "text" },
  { name: "Precio", label: "Precio", type: "number" },
  { name: "duracion_min", label: "Duración (minutos)", type: "number" },
  { name: "activo", label: "Activo", type: "boolean", defaultValue: true },
];

const cardFields = [
  { label: "Servicio", value: service => service.NomCorte },
  { label: "Precio", value: service => formatPrice(service.Precio) },
  { label: "Duración", value: service => `${service.duracion_min} min` },
  { label: "Activo", value: service => service.activo ? "Sí" : "No" },
];

export default function AdminServicios() {
  return <AdminCrud title="Servicios" collectionName="Servicios" fields={fields} cardFields={cardFields} />;
}
