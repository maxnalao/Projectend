import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import { UserProvider, useUser } from "./context/UserContext";
import LineNotificationPage from "./pages/LineNotificationPage";
import Register from "./pages/Register.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import ProfilePage from "./pages/ProfilePage";
import HistoryPage from "./pages/HistoryPage";
import ProductsPage from "./pages/ProductsPage.jsx";
import StockPage from "./pages/StockPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import StockReceivePage from "./pages/StockReceivePage.jsx";
import StockIssuePage from "./pages/StockIssuePage.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

// ✅ RequireAuth Component - ตรวจสอบว่า login หรือยัง
function RequireAuth({ children }) {
  return localStorage.getItem("access") ? children : <Navigate to="/login" replace />;
}

// ✅ EmployeeOnlyRoute Component - สำหรับพนักงาน
function EmployeeOnlyRoute({ children }) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // ถ้าเป็น admin ให้ไป admin dashboard แทน
  if (user && (user.role === 'admin' || user.is_superuser)) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return children;
}

// ✅ AdminOnlyRoute Component - สำหรับเจ้าของ/Admin
function AdminOnlyRoute({ children }) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && !user.is_superuser)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-gray-600 mb-6">หน้านี้สำหรับเจ้าของร้าน/Admin เท่านั้น</p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            ← กลับไปหน้าก่อนหน้า
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ✅ Employee Dashboard - แยกจาก Admin */}
          <Route
            path="/employee-dashboard"
            element={
              <RequireAuth>
                <EmployeeOnlyRoute>
                  <EmployeeDashboard />
                </EmployeeOnlyRoute>
              </RequireAuth>
            }
          />

          {/* ✅ Admin Dashboard - แยกจาก Employee */}
          <Route
            path="/admin-dashboard"
            element={
              <RequireAuth>
                <AdminOnlyRoute>
                  <AdminDashboard />
                </AdminOnlyRoute>
              </RequireAuth>
            }
          />

          {/* ✅ ส่วนที่ต้องล็อกอิน */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="overview" element={<OverviewPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="stock/receive" element={<StockReceivePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="stock/issue" element={<StockIssuePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="line-notifications" element={<LineNotificationPage />} />
            
            {/* ✅ หน้า Users - เฉพาะ Admin เท่านั้น */}
            <Route 
              path="users" 
              element={
                <AdminOnlyRoute>
                  <UsersPage />
                </AdminOnlyRoute>
              } 
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}