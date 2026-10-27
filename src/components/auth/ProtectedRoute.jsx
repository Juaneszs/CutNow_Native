import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import AlertaAcceso from "../comunes/AlertaAcceso";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, cargando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cargando) return;
    if (user && adminOnly && !isAdmin) {
      navigate("/catalogo");
    }
  }, [user, isAdmin, cargando, navigate, adminOnly]);

  if (cargando) return null;
  if (!user) {
    return <AlertaAcceso
      onLogin={() => navigate("/", { replace: true })}
      onRegister={() => navigate("/registro", { replace: true })}
      onCancel={() => navigate(-1)}
    />;
  }
  if (adminOnly && !isAdmin) return null;

  return children;
}
