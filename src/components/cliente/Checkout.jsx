import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/useAuth";
import Dialogo from "../comunes/Dialogo";
import EstadoVacio from "../comunes/EstadoVacio";
import ImagenConFallback from "../comunes/ImagenConFallback";
import Cargando from "../comunes/Cargando";
import "../Styles/Checkout.css";
import { crearPedido } from "../../services/pedidosService";
import { formatPrice } from "../../utils/formatting";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, perfil } = useAuth();

  const carrito = location.state?.carrito || [];

  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [dialogo, setDialogo] = useState(null);

  const total = carrito.reduce((s, p) => s + Number(p.precio), 0);

  async function confirmarCompra() {
    if (!user?.uid) {
      setError("Debes iniciar sesión para confirmar tu pedido.");
      return;
    }
    if (carrito.length === 0 || !carrito.every(producto =>
      typeof producto.nombre === "string" &&
      producto.nombre.trim() &&
      Number.isFinite(Number(producto.precio)) &&
      Number(producto.precio) > 0
    )) {
      setError("El carrito no contiene productos válidos.");
      return;
    }

    setGuardando(true);
    setError("");
    const ventanaWhatsApp = metodoPago === "transferencia" ? window.open("about:blank", "_blank") : null;
    try {
      const usuarioNombre = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ")
        || user.displayName
        || user.email
        || "Cliente";
      await crearPedido({
        usuario_id: user.uid,
        usuario_nombre: usuarioNombre,
        productos: carrito.map(producto => ({
          nombre: producto.nombre,
          precio: Number(producto.precio),
        })),
        total,
        metodo_pago: metodoPago,
        estado: "pendiente",
      });

      if (metodoPago === "transferencia") {
      // mensaje para whatsapp
        let mensaje = "💈 *Hola, quiero confirmar mi pedido de la tienda:*\n\n";
      
        carrito.forEach(p => {

          mensaje += `▪️ ${p.nombre} - ${formatPrice(p.precio)}\n`;
        });

        mensaje += `\n *Total a transferir: ${formatPrice(total)}*`;
        mensaje += "\n\nQuedo atento a los datos para realizar la transferencia.";

        // 2. Número  de whatsapp
        const numeroWhatsApp = "573005782087"; // Tu número real
      
        // 3. Creamos el enlace oficial de WhatsApp
        const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
      
        // 4. Abrir WhatsApp en una pestaña nueva
        if (ventanaWhatsApp) {
          ventanaWhatsApp.location.href = url;
        } else {
          window.location.assign(url);
        }

        // 5. Redirigir al usuario al inicio después de enviarlo a WhatsApp
        if (ventanaWhatsApp) navigate("/");

      } else {
        setDialogo({
          icono: "✅",
          titulo: "¡Pedido reservado!",
          mensaje: "Págalo en efectivo al reclamarlo en la barbería.",
          confirmar: "Continuar",
          tipo: "aviso",
          onConfirmar: () => navigate("/"),
        });
      }
    } catch (error) {
      ventanaWhatsApp?.close();
      console.error("Error al guardar el pedido:", error);
      setError("No se pudo guardar el pedido. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  function cancelarCompra() {
    setDialogo({
      icono: "⚠️",
      titulo: "¿Cancelar compra?",
      mensaje: "Si sales ahora, perderás los productos seleccionados.",
      confirmar: "Sí, cancelar",
      cancelar: "Seguir comprando",
      tipo: "confirmacion",
      onConfirmar: () => navigate("/tienda"),
    });
  }

  return (
    <div className="checkout-container">
      {dialogo && (
        <Dialogo
          {...dialogo}
          onConfirmar={() => {
            const confirmar = dialogo.onConfirmar;
            setDialogo(null);
            confirmar();
          }}
          onCancelar={() => setDialogo(null)}
        />
      )}
      <h1>Finalizar compra</h1>
      {error && <p className="checkout-error" role="alert">{error}</p>}

      {/* PRODUCTOS */}
      <section className="checkout-card">
        <h2>Productos</h2>

        {carrito.length === 0 ? (
          <EstadoVacio
            icono="🛒"
            mensaje="No hay productos en el carrito."
            boton="Ir a la tienda"
            onClick={() => navigate("/tienda")}
          />
        ) : (
          carrito.map(p => (
            <div key={p.idCarrito} className="checkout-item">
              
              <div className="checkout-item-left">
                <ImagenConFallback src={p.imagen} nombre={p.nombre} className="checkout-item-image" tipo="carrito" />
                <span className="checkout-item-name">
                  {p.nombre}
                </span>
              </div>

              <span className="checkout-item-price">
                {formatPrice(p.precio)}
              </span>

            </div>
          ))
        )}

        {carrito.length > 0 && (
          <div className="checkout-total">
            Total: <strong>{formatPrice(total)}</strong>
          </div>
        )}
      </section>

      {/* MÉTODO DE PAGO */}
      {carrito.length > 0 && (
        <section className="checkout-card">
          <h2>Método de pago</h2>
          <select
            value={metodoPago}
            onChange={e => setMetodoPago(e.target.value)}
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </section>
      )}

      {/* CONFIRMAR */}
      {carrito.length > 0 && <button
        className="checkout-confirm-button"
        onClick={confirmarCompra}
        disabled={carrito.length === 0 || guardando}
      >
        {guardando ? <Cargando mensaje="Guardando pedido..." /> : "Confirmar compra"}
      </button>}

      <button
        className="checkout-cancel-button"
        onClick={cancelarCompra}
      >
        Cancelar compra
      </button>
    </div>
  );
}