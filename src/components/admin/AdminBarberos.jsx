import AdminCrud from "./AdminCrud";

const fields = [
  { name: "Nombre", label: "Nombre", type: "text" },
  { name: "especialidad", label: "Especialidad", type: "text" },
  { name: "foto", label: "Foto (link de imagen)", type: "url" },
  {
    name: "sede_id",
    label: "Sede",
    type: "select",
    optionsCollection: "Sedes",
    optionLabel: sede => sede.NomSede || "Sede sin nombre",
  },
  {
    name: "estado",
    label: "Estado",
    type: "select",
    options: [{ value: "activo", label: "Activo" }, { value: "inactivo", label: "Inactivo" }],
    defaultValue: "activo",
  },
];

const cardFields = [
  { label: "Nombre", value: barber => barber.Nombre },
  { label: "Especialidad", value: barber => barber.especialidad },
  { label: "Sede", value: (barber, options) => options.sede_id?.find(option => option.value === barber.sede_id)?.label || barber.sede_id },
  { label: "Estado", value: barber => barber.estado },
];

export default function AdminBarberos() {
  return <AdminCrud title="Barberos" collectionName="Barberos" fields={fields} cardFields={cardFields} />;
}
