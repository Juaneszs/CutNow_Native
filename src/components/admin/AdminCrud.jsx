import { useEffect, useState } from "react";
import Cargando from "../comunes/Cargando";
import Dialogo from "../comunes/Dialogo";
import EstadoVacio from "../comunes/EstadoVacio";
import { createRecord, deleteRecord, getRecords, updateRecord } from "../../services/collectionService";
import "../Styles/AdminCrud.css";

export default function AdminCrud({ title, collectionName, fields, cardFields }) {
  const [records, setRecords] = useState([]);
  const [options, setOptions] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [recordEditando, setRecordEditando] = useState(null);
  const [form, setForm] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [registroPendiente, setRegistroPendiente] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      try {
        const [loadedRecords, ...loadedOptionRecords] = await Promise.all([
          getRecords(collectionName),
          ...fields
            .filter(field => field.optionsCollection)
            .map(field => getRecords(field.optionsCollection)),
        ]);
        if (!activo) return;

        setRecords(loadedRecords);
        const formattedOptions = {};
        fields.filter(field => field.optionsCollection).forEach((field, index) => {
          formattedOptions[field.name] = loadedOptionRecords[index].map(item => ({
            value: item.id,
            label: field.optionLabel(item),
          }));
        });
        setOptions(formattedOptions);
      } catch (error) {
        console.error(`Error al cargar ${title.toLowerCase()}:`, error);
        if (activo) setErrorCarga(`No se pudieron cargar ${title.toLowerCase()}.`);
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarDatos();
    return () => { activo = false; };
  }, [collectionName, fields, title]);

  function empezarNuevo() {
    setRecordEditando(null);
    setForm(Object.fromEntries(fields.map(field => [field.name, field.defaultValue ?? ""])));
    setMensaje(null);
  }

  function empezarEdicion(record) {
    setRecordEditando(record);
    setForm(Object.fromEntries(fields.map(field => [field.name, record[field.name] ?? field.defaultValue ?? ""])));
    setMensaje(null);
  }

  function cambiarCampo(field, value) {
    setForm(current => ({
      ...current,
      [field.name]: field.type === "number"
        ? value
        : field.type === "boolean"
          ? value === "true"
          : value,
    }));
  }

  async function guardar(event) {
    event.preventDefault();
    const fieldInvalido = fields.find(field => {
      const value = form[field.name];
      if (field.type === "boolean") return typeof value !== "boolean";
      if (field.type === "number") {
        return value === "" || !Number.isFinite(Number(value)) || Number(value) <= 0;
      }
      return typeof value !== "string" || !value.trim();
    });

    if (fieldInvalido) {
      setMensaje({
        type: "error",
        text: fieldInvalido.type === "number"
          ? `${fieldInvalido.label} debe ser un número mayor a 0.`
          : `El campo ${fieldInvalido.label} es obligatorio.`,
      });
      return;
    }

    const data = Object.fromEntries(fields.map(field => [
      field.name,
      field.type === "number" ? Number(form[field.name]) : form[field.name],
    ]));
    setGuardando(true);
    setMensaje(null);
    try {
      if (recordEditando) {
        await updateRecord(collectionName, recordEditando.id, data);
        setRecords(current => current.map(item => item.id === recordEditando.id ? { ...item, ...data } : item));
        setMensaje({ type: "success", text: `${title.slice(0, -1)} actualizado correctamente.` });
      } else {
        const result = await createRecord(collectionName, data);
        setRecords(current => [...current, result]);
        setMensaje({ type: "success", text: `${title.slice(0, -1)} creado correctamente.` });
      }
      setRecordEditando(null);
      setForm(Object.fromEntries(fields.map(field => [field.name, field.defaultValue ?? ""])));
    } catch (error) {
      console.error(`Error al guardar ${title.toLowerCase()}:`, error);
      setMensaje({ type: "error", text: `No se pudo guardar ${title.toLowerCase()}. Intenta de nuevo.` });
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(record) {
    setRegistroPendiente(record);
  }

  async function confirmarEliminacion() {
    const record = registroPendiente;
    if (!record) return;
    setRegistroPendiente(null);
    try {
      await deleteRecord(collectionName, record.id);
      setRecords(current => current.filter(item => item.id !== record.id));
      if (recordEditando?.id === record.id) {
        setRecordEditando(null);
        setForm(Object.fromEntries(fields.map(field => [field.name, field.defaultValue ?? ""])));
      }
      setMensaje({ type: "success", text: `${title.slice(0, -1)} eliminado correctamente.` });
    } catch (error) {
      console.error(`Error al eliminar registro de ${collectionName}:`, error);
      setMensaje({ type: "error", text: `No se pudo eliminar el registro. Intenta de nuevo.` });
    }
  }

  return (
    <>
    {registroPendiente && (
      <Dialogo
        titulo="¿Eliminar registro?"
        mensaje={`¿Eliminar "${cardFields[0].value(registroPendiente)}"? Esta acción no se puede deshacer.`}
        confirmar="Eliminar"
        cancelar="Cancelar"
        onConfirmar={confirmarEliminacion}
        onCancelar={() => setRegistroPendiente(null)}
      />
    )}
    <div className="admin-crud-page">
      <header className="admin-crud-heading">
        <h1>Gestionar <span>{title}</span></h1>
      </header>

      {mensaje && <p className={`admin-crud-message ${mensaje.type}`} role="status">{mensaje.text}</p>}

      <section className="admin-crud-panel">
        <h2>{recordEditando ? "Editar registro" : `Nuevo registro`}</h2>
        <form className="admin-crud-form" onSubmit={guardar} noValidate>
          {fields.map(field => (
            <label className="admin-crud-field" key={field.name}>
              <span>{field.label}</span>
              {field.type === "select" || field.type === "boolean" ? (
                <select
                  value={field.type === "boolean" ? String(form[field.name] ?? "") : form[field.name] ?? ""}
                  onChange={event => cambiarCampo(field, event.target.value)}
                >
                  <option value="" disabled>Selecciona una opción</option>
                  {(field.type === "boolean"
                    ? [{ value: "true", label: "Sí" }, { value: "false", label: "No" }]
                    : field.options || options[field.name] || []
                  ).map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "number" ? "number" : field.type === "url" ? "url" : field.inputType || "text"}
                  step={field.type === "number" ? "any" : undefined}
                  value={form[field.name] ?? ""}
                  onChange={event => cambiarCampo(field, event.target.value)}
                />
              )}
            </label>
          ))}
          <div className="admin-crud-form-actions">
            <button className="admin-crud-button primary" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : recordEditando ? "Guardar cambios" : "Crear"}
            </button>
            {recordEditando && (
              <button className="admin-crud-button secondary" type="button" onClick={empezarNuevo}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-crud-list">
        <h2>{title}</h2>
        {cargando ? (
          <Cargando />
        ) : errorCarga ? (
          <p className="admin-crud-message error" role="alert">{errorCarga}</p>
        ) : records.length === 0 ? (
          <EstadoVacio icono="📭" mensaje="No hay registros" />
        ) : (
          <div className="admin-crud-grid">
            {records.map(record => (
              <article className="admin-crud-card" key={record.id}>
                {(record.foto || record.imagen) && (
                  <img
                    className="admin-crud-card-image"
                    src={record.foto || record.imagen}
                    alt={record.Nombre || record.nombre || title}
                  />
                )}
                {cardFields.map(field => (
                  <p key={field.label}>
                    <span>{field.label}</span>
                    <strong>{field.value(record, options) || "—"}</strong>
                  </p>
                ))}
                <div className="admin-crud-card-actions">
                  <button className="admin-crud-button secondary" onClick={() => empezarEdicion(record)}>Editar</button>
                  <button className="admin-crud-button danger" onClick={() => eliminar(record)}>Eliminar</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
    </>
  );
}
