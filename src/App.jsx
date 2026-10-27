import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';

import Checkout from './components/cliente/Checkout';
import Login from './components/auth/login';
import Registro from './components/auth/Registro';
import RecuperarContrasena from './components/auth/RecuperarContrasena';
import Catalogo from './components/cliente/Catalogo';
import Header from './components/layout/Header';
import Footer from './components/layout/footer';
import AgendarCitas from './components/cliente/AgendarCitas';
import TiendaSection from './components/cliente/TiendaSection';
import MisCitas from './components/cliente/MisCitas';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminCitas from './components/admin/AdminCitas';
import AdminBarberos from './components/admin/AdminBarberos';
import AdminServicios from './components/admin/AdminServicios';
import AdminSedes from './components/admin/AdminSedes';
import AdminProductos from './components/admin/AdminProductos';
import AdminPedidos from './components/admin/AdminPedidos';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error inesperado al mostrar la pantalla:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-fallback" role="alert">
          <h1>Algo salió mal</h1>
          <p>No pudimos mostrar esta pantalla. Intenta volver al inicio.</p>
          <Link className="btn-primary" to="/">Volver al inicio</Link>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

function NotFound() {
  return (
    <div className="app-error-fallback">
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no existe.</p>
      <Link className="btn-primary" to="/">Volver al inicio</Link>
    </div>
  );
}

function GuestRoute({ children }) {
  const { user, cargando } = useAuth();

  if (cargando) return null;
  if (user) return <Navigate to="/catalogo" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Header />
          <main style={{ flexGrow: 1, paddingBottom: '60px' }}>
            <PageErrorBoundary>
            <Routes>
              {/* PÚBLICAS */}
              <Route path="/checkout" element={
                <ProtectedRoute><Checkout /></ProtectedRoute>
              } />
              <Route path="/" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/registro" element={<GuestRoute><Registro /></GuestRoute>} />
              <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
              <Route path="/tienda" element={<TiendaSection />} />

              {/* PROTEGIDAS (requieren login) */}
              <Route path="/catalogo" element={
                <ProtectedRoute><Catalogo /></ProtectedRoute>
              } />
              <Route path="/agendar" element={
                <ProtectedRoute><AgendarCitas /></ProtectedRoute>
              } />
              <Route path="/mis-citas" element={
                <ProtectedRoute><MisCitas /></ProtectedRoute>
              } />

              {/* SOLO ADMIN */}
              <Route path="/admin" element={
                <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/citas" element={
                <ProtectedRoute adminOnly><AdminCitas /></ProtectedRoute>
              } />
              <Route path="/admin/barberos" element={
                <ProtectedRoute adminOnly><AdminBarberos /></ProtectedRoute>
              } />
              <Route path="/admin/servicios" element={
                <ProtectedRoute adminOnly><AdminServicios /></ProtectedRoute>
              } />
              <Route path="/admin/sedes" element={
                <ProtectedRoute adminOnly><AdminSedes /></ProtectedRoute>
              } />
              <Route path="/admin/productos" element={
                <ProtectedRoute adminOnly><AdminProductos /></ProtectedRoute>
              } />
              <Route path="/admin/pedidos" element={
                <ProtectedRoute adminOnly><AdminPedidos /></ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </PageErrorBoundary>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
