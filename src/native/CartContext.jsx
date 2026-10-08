import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CartContext } from "./cart-context";
const CART_KEY = "cutnow.cart";

export function CartProvider({ children }) {
  const [carrito, setCarrito] = useState([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY)
      .then(value => setCarrito(value ? JSON.parse(value) : []))
      .catch(error => console.error("No se pudo recuperar el carrito:", error))
      .finally(() => setCargado(true));
  }, []);

  useEffect(() => {
    if (cargado) AsyncStorage.setItem(CART_KEY, JSON.stringify(carrito));
  }, [cargado, carrito]);

  function agregar(producto) {
    setCarrito(actual => [...actual, { ...producto, idCarrito: `${Date.now()}-${Math.random()}` }]);
  }

  function eliminar(idCarrito) {
    setCarrito(actual => actual.filter(item => item.idCarrito !== idCarrito));
  }

  function vaciar() {
    setCarrito([]);
  }

  return (
    <CartContext.Provider value={{ carrito, cargado, agregar, eliminar, vaciar }}>
      {children}
    </CartContext.Provider>
  );
}
