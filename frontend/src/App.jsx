// frontend/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import { UserProvider } from "./context/UserContext";
import LineNotificationPage from "./pages/LineNotificationPage";
import Register from "./pages/Register.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import TaskListPage from "./pages/TaskListPage.jsx";
import ProfilePage from "./pages/ProfilePage";
import HistoryPage from "./pages/HistoryPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminFestivalPage from "./pages/AdminFestivalPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import StockPage from "./pages/StockPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import TaskManagementPage from "./pages/TaskManagementPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import StockReceivePage from "./pages/StockReceivePage.jsx";
import StockIssuePage from "./pages/StockIssuePage.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";

// ✅ RequireAuth Component - ตรวจสอบว่า login หรือยัง
function RequireAuth({ children }) {
  return localStorage.getItem("access") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          {/* ✅ Public Routes - ไม่ต้อง login */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* ✅ Protected Routes - ต้อง login */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="stock/receive" element={<StockReceivePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="task-management" element={<TaskManagementPage />} />
            <Route path="tasks" element={<TaskListPage />} />
            <Route path="stock/issue" element={<StockIssuePage />} />
            <Route path="festivals" element={<AdminFestivalPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="line-notifications" element={<LineNotificationPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}