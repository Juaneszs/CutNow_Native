import { useEffect, useState } from "react";
import Cargando from "../comunes/Cargando";
import Dialogo from "../comunes/Dialogo";
import EstadoVacio from "../comunes/EstadoVacio";
import "../Styles/AdminCrud.css";
import { actualizarEstadoPedido, eliminarPedido, getPedidos } from "../../services/pedidosService";
import { formatPrice } from "../../utils/formatting";

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pedidoOcupado, setPedidoOcupado] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [pedidoPendiente, setPedidoPendiente] = useState(null);

  useEffect(() => {
    let activo = true;
    async function cargarPedidos() {
      try {
        const datos = await getPedidos();
        if (activo) {
          setPedidos(datos
            .sort((a, b) => (b.fecha_creacion?.toMillis?.() || 0) - (a.fecha_creacion?.toMillis?.() || 0)));
        }
      } catch (error) {
        console.error("Error al cargar pedidos:", error);
        if (activo) setErrorCarga("No se pudieron cargar los pedidos.");
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargarPedidos();
    return () => { activo = false; };
  }, []);

  async function cambiarEstado(pedido, estado) {
    setPedidoOcupado(pedido.id);
    setMensaje(null);
    try {
      await actualizarEstadoPedido(pedido.id, estado);
      setPedidos(current => current.map(item => item.id === pedido.id ? { ...item, estado } : item));
      setMensaje({ type: "success", text: `Pedido marcado como ${estado}.` });
    } catch (error) {
      console.error("Error al actualizar pedido:", error);
      setMensaje({ type: "error", text: "No se pudo actualizar el pedido." });
    } finally {
      setPedidoOcupado(null);
    }
  }

  async function eliminar(pedido) {
    setPedidoPendiente(pedido);
  }

  async function confirmarEliminacion() {
    const pedido = pedidoPendiente;
    if (!pedido) return;
    setPedidoPendiente(null);
    setPedidoOcupado(pedido.id);
    setMensaje(null);
    try {
      await eliminarPedido(pedido.id);
      setPedidos(current => current.filter(item => item.id !== pedido.id));
      setMensaje({ type: "success", text: "Pedido eliminado correctamente." });
    } catch (error) {
      console.error("Error al eliminar pedido:", error);
      setMensaje({ type: "error", text: "No se pudo eliminar el pedido." });
    } finally {
      setPedidoOcupado(null);
    }
  }

  return (
    <>
    {pedidoPendiente && (
      <Dialogo
        titulo="¿Eliminar pedido?"
        mensaje={`¿Eliminar el pedido de ${pedidoPendiente.usuario_nombre || "este cliente"}? Esta acción no se puede deshacer.`}
        confirmar="Eliminar"
        cancelar="Cancelar"
        onConfirmar={confirmarEliminacion}
        onCancelar={() => setPedidoPendiente(null)}
      />
    )}
    <div className="admin-crud-page">
      <header className="admin-crud-heading">
        <h1>Gestionar <span>Pedidos</span></h1>
      </header>
      {mensaje && <p className={`admin-crud-message ${mensaje.type}`} role="status">{mensaje.text}</p>}
      <section className="admin-crud-list">
        {cargando ? (
          <Cargando />
        ) : errorCarga ? (
          <p className="admin-crud-message error" role="alert">{errorCarga}</p>
        ) : pedidos.length === 0 ? (
          <EstadoVacio icono="📦" mensaje="No hay registros" />
        ) : (
          <div className="admin-crud-grid">
            {pedidos.map(pedido => (
              <article className="admin-crud-card" key={pedido.id}>
                <p><span>Cliente</span><strong>{pedido.usuario_nombre || "—"}</strong></p>
                <p><span>Pago</span><strong>{pedido.metodo_pago || "—"}</strong></p>
                <p><span>Estado</span><strong>{pedido.estado || "pendiente"}</strong></p>
                <p><span>Total</span><strong>{formatPrice(pedido.total)}</strong></p>
                <div className="admin-order-products">
                  <span>Productos</span>
                  <ul>
                    {(pedido.productos || []).map((product, index) => (
                      <li key={`${product.nombre}-${index}`}>
                        {product.nombre} — {formatPrice(product.precio)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="admin-crud-card-actions">
                  {pedido.estado !== "entregado" && (
                    <button
                      className="admin-crud-button primary"
                      onClick={() => cambiarEstado(pedido, "entregado")}
                      disabled={pedidoOcupado === pedido.id}
                    >
                      Marcar entregado
                    </button>
                  )}
                  {pedido.estado !== "cancelado" && (
                    <button
                      className="admin-crud-button danger"
                      onClick={() => cambiarEstado(pedido, "cancelado")}
                      disabled={pedidoOcupado === pedido.id}
                    >
                      Cancelar pedido
                    </button>
                  )}
                  <button
                    className="admin-crud-button secondary"
                    onClick={() => eliminar(pedido)}
                    disabled={pedidoOcupado === pedido.id}
                  >
                    Eliminar
                  </button>
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
