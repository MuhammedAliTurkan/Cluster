import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
  const { token, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // istersen burada Loader koy

  if (!token) {
    // yetkisiz → login'e, hedefi state.from ile taşı
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
