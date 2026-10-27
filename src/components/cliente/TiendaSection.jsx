import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import AlertaAcceso from "../comunes/AlertaAcceso";
import Cargando from "../comunes/Cargando";
import EstadoVacio from "../comunes/EstadoVacio";
import ImagenConFallback from "../comunes/ImagenConFallback";
import { getProductos } from "../../services/productosService";
import { formatPrice } from "../../utils/formatting";

import "../Styles/TiendaSection.css";

//  Iconos SVG ---
const CartIcon = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

function leerCarritoGuardado() {
  try {
    const guardado = localStorage.getItem("carrito");
    const carrito = guardado ? JSON.parse(guardado) : [];
    return Array.isArray(carrito) ? carrito : [];
  } catch (error) {
    console.error("No se pudo leer el carrito guardado:", error);
    return [];
  }
}

//  Componentes Pequeños ---
const ProductCard = ({ producto, agregarSeguro }) => {
  return (
    <div className="product-card">
      <div className="product-card-image-wrapper">
        <ImagenConFallback src={producto.imagen} nombre={producto.nombre} className="product-card-image" />
        <div className="product-card-image-shadow"></div>
      </div>

      <div className="product-card-details">
        <h3 className="product-card-name">{producto.nombre}</h3>
        <p className="product-card-price">${producto.precio}</p>
        <p className="product-card-shipping product-pickup">
          📍 Recogida en local
        </p>
      </div>

      <button
        className="product-card-add-button"
        onClick={() => agregarSeguro(producto)}
      >
        <CartIcon />
        Añadir al Carrito
      </button>
    </div>
  );
};


const CartSidebar = ({ productosCarrito, eliminarDelCarrito }) => {
  const navigate = useNavigate();

  const total = productosCarrito.reduce(
    (suma, item) => suma + item.precio,
    0
  );

  return (
    <aside className="cart-sidebar">
      <h2 className="cart-sidebar-title">
        Carrito {productosCarrito.length > 0 && `(${productosCarrito.length})`}
      </h2>

      <div className="cart-sidebar-items">
        {productosCarrito.length === 0 ? (
          <p className="cart-sidebar-empty">
            Tu carrito está vacío
          </p>
        ) : (
          productosCarrito.map(producto => (
            <div
              key={producto.idCarrito}
              className="cart-sidebar-item"
            >
              <ImagenConFallback src={producto.imagen} nombre={producto.nombre} className="cart-sidebar-item-image" tipo="carrito" />

              <div className="cart-sidebar-item-details">
                <p className="cart-sidebar-item-name">
                  {producto.nombre}
                </p>
                <p className="cart-sidebar-item-price">
                  ${producto.precio}
                </p>
              </div>

              <button
                onClick={() =>
                  eliminarDelCarrito(producto.idCarrito)
                }
                className="cart-remove-button"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="cart-sidebar-summary">
        <p className="cart-sidebar-total-label">Total</p>
        <p className="cart-sidebar-total-amount">
          {formatPrice(total)}
        </p>
      </div>

      
      <button
        className="cart-sidebar-checkout-button"
        disabled={productosCarrito.length === 0}
        onClick={() => navigate("/checkout", { state: { carrito: productosCarrito } })}
      >
        Continuar compra
      </button>
    </aside>
  );
}

// --- COMPONENTE PRINCIPAL ---
const TiendaSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('Herramientas');
  const [mostrarAcceso, setMostrarAcceso] = useState(false);
  const [carrito, setCarrito] = useState(leerCarritoGuardado);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    async function cargarTienda() {
      try {
        const datos = await getProductos();
        setProductos(datos);
      } catch (error) {
        console.error("Error al cargar los productos:", error);
        setErrorCarga("No se pudo cargar la tienda. Intenta de nuevo.");
      } finally {
        setCargando(false);
      }
    }
    cargarTienda();
  }, []);
  useEffect(() => {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}, [carrito]);


  const agregarAlCarrito = (producto) => {
    const nuevoProducto = { ...producto, idCarrito: Date.now() + Math.random() };
    setCarrito([...carrito, nuevoProducto]);
  };

  
  const agregarSeguro = (producto) => {
    if (!user) {
      setMostrarAcceso(true);
      return;
    }
    agregarAlCarrito(producto);
  };

  const eliminarDelCarrito = (idCarrito) => {
    setCarrito(carrito.filter(item => item.idCarrito !== idCarrito));
  };

  const tabs = [
    { nombre: 'Herramientas', icono: '✂️' },
    { nombre: 'Productos', icono: '🧴' },
    { nombre: 'Accesorios', icono: '🛍️' }
  ];

  const productosFiltrados = productos.filter(p => p.categoria === activeTab);

  return (
    <div className="store-section-container">
      <div className="store-section-main-content">
        <header className="store-section-header">
          <h1 className="store-section-title">
            Tu Kit de Barbería de <span className="text-green">Élite, al instante.</span>
          </h1>
          <p className="store-section-subtitle">
            Equípate con lo mejor. CutNow presenta su exclusiva tienda profesional.
          </p>
        </header>

        <nav className="store-section-filters">
          {tabs.map(tab => (
            <button
              key={tab.nombre}
              className={`store-section-filter-button ${activeTab === tab.nombre ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.nombre)}
            >
              <span className="store-filter-icon">{tab.icono}</span>
              {tab.nombre}
            </button>
          ))}
        </nav>

        {cargando ? (
          <Cargando mensaje="Cargando inventario premium..." />
        ) : errorCarga ? (
          <EstadoVacio icono="⚠️" mensaje={errorCarga} />
        ) : productosFiltrados.length === 0 ? (
          <EstadoVacio icono="🛍️" mensaje="No hay productos en esta categoría" />
        ) : (
          <div className="product-grid">
            {productosFiltrados.map(producto => (
              <ProductCard
                key={producto.id}
                producto={producto}
                agregarSeguro={agregarSeguro}
              />
            ))}
          </div>
        )}
      </div>

      <CartSidebar
        productosCarrito={carrito}
        eliminarDelCarrito={eliminarDelCarrito}
      />
      {mostrarAcceso && (
        <AlertaAcceso
          onLogin={() => { setMostrarAcceso(false); navigate("/"); }}
          onRegister={() => { setMostrarAcceso(false); navigate("/registro"); }}
          onCancel={() => setMostrarAcceso(false)}
        />
      )}
    </div>
  );
};

export default TiendaSection;