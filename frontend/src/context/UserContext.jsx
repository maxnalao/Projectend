// src/context/UserContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const loadUser = async () => {
    // ✅ เช็คว่าไม่ใช่หน้า auth (เพิ่ม forgot-password และ reset-password)
    const isAuthPage = 
      location.pathname === '/login' || 
      location.pathname === '/register' ||
      location.pathname === '/forgot-password' ||
      location.pathname.startsWith('/reset-password') ||
      location.pathname === '/';
    
    if (isAuthPage) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('access');
    
    // ✅ ถ้าไม่มี token ให้ redirect ไป login
    if (!token) {
      setLoading(false);
      setUser(null);
      navigate("/login");
      return;
    }

    try {
      const { data } = await api.get("/auth/user/");
      setUser(data);
      console.log("✅ User loaded:", data);
    } catch (err) {
      console.error("❌ Load user error:", err);
      
      // ✅ ถ้า token หมดอายุ ให้ clear และ redirect
      if (err.response?.status === 401 || err.response?.status === 404) {
        localStorage.clear();
        setUser(null);
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    console.log("🔄 Refreshing user...");
    setLoading(true);
    await loadUser();
  };

  // ✅ โหลด user ทุกครั้งที่เปลี่ยนหน้า
  useEffect(() => {
    loadUser();
  }, [location.pathname]);

  const value = {
    user,
    loading,
    refreshUser,
    setUser
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}