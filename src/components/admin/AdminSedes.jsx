import AdminCrud from "./AdminCrud";

const fields = [
  { name: "NomSede", label: "Nombre de la sede", type: "text" },
  { name: "Ciudad", label: "Ciudad", type: "text" },
  { name: "Direccion", label: "Dirección", type: "text" },
  { name: "activa", label: "Activa", type: "boolean", defaultValue: true },
];

const cardFields = [
  { label: "Sede", value: venue => venue.NomSede },
  { label: "Ciudad", value: venue => venue.Ciudad },
  { label: "Dirección", value: venue => venue.Direccion },
  { label: "Activa", value: venue => venue.activa ? "Sí" : "No" },
];

export default function AdminSedes() {
  return <AdminCrud title="Sedes" collectionName="Sedes" fields={fields} cardFields={cardFields} />;
}
