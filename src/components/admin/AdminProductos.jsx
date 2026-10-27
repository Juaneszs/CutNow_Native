import AdminCrud from "./AdminCrud";
import { formatPrice } from "../../utils/formatting";

const fields = [
  { name: "nombre", label: "Nombre", type: "text" },
  { name: "precio", label: "Precio", type: "number" },
  { name: "imagen", label: "Imagen (link)", type: "url" },
  {
    name: "categoria",
    label: "Categoría",
    type: "select",
    options: [
      { value: "Herramientas", label: "Herramientas" },
      { value: "Productos", label: "Productos" },
      { value: "Accesorios", label: "Accesorios" },
    ],
  },
];

const cardFields = [
  { label: "Producto", value: product => product.nombre },
  { label: "Precio", value: product => formatPrice(product.precio) },
  { label: "Categoría", value: product => product.categoria },
];

export default function AdminProductos() {
  return <AdminCrud title="Productos" collectionName="Productos" fields={fields} cardFields={cardFields} />;
}
