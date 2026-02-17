// src/pages/UsersPage.jsx
import { useEffect, useState, useCallback } from "react";
import api from "../api";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, admin: 0, staff: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    is_staff: false,
    is_superuser: false,
  });

  // ✅ Load users function (reusable)
  const loadUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get("/auth/users/");
      
      if (Array.isArray(data)) {
        setUsers(data);
        calculateStats(data);
      } else if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
        if (data.stats) {
          setStats(data.stats);
        } else {
          calculateStats(data.users);
        }
      } else {
        console.error("Unexpected API response format:", data);
        setUsers([]);
      }
    } catch (err) {
      console.error("Load users error:", err);
      if (showLoading) {
        alert("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
      }
      setUsers([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // ✅ Initial load
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ✅ Polling - รีเฟรชข้อมูลทุก 30 วินาที สำหรับ Real-time Status
  useEffect(() => {
    const interval = setInterval(() => {
      loadUsers(false); // ไม่แสดง loading spinner
    }, 30000); // 30 วินาที

    return () => clearInterval(interval);
  }, [loadUsers]);

  const calculateStats = (userList) => {
    const stats = {
      total: userList.length,
      admin: userList.filter(u => u.is_superuser).length, // ✅ แก้จาก .count เป็น .length
      staff: userList.filter(u => !u.is_superuser).length,
      active: userList.filter(u => u.is_online).length,
      inactive: userList.filter(u => !u.is_active).length
    };
    setStats(stats);
    return stats;
  };

  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
    const matchSearch = 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchRole = true;
    if (filterRole === "admin") {
      matchRole = user.is_superuser;
    } else if (filterRole === "staff") {
      matchRole = !user.is_superuser;
    }
    
    return matchSearch && matchRole;
  }) : [];

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username || "",
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      is_staff: user.is_staff || false,
      is_superuser: user.is_superuser || false,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    try {
      const { data } = await api.patch(`/auth/users/${selectedUser.id}/`, editForm);
      
      const updatedUser = data.user || data;
      
      const newUsers = users.map(u => u.id === selectedUser.id ? updatedUser : u);
      setUsers(newUsers);
      calculateStats(newUsers);
      
      setEditModalOpen(false);
      setSelectedUser(null);
      alert("แก้ไขข้อมูลสำเร็จ");
    } catch (err) {
      console.error("Edit user error:", err);
      alert("แก้ไขข้อมูลไม่สำเร็จ: " + (err.response?.data?.detail || "เกิดข้อผิดพลาด"));
    }
  };

  const handleDelete = async (user) => {
    if (window.confirm(`ต้องการลบผู้ใช้ "${user.username}" ใช่หรือไม่?`)) {
      try {
        await api.delete(`/auth/users/${user.id}/`);
        const newUsers = users.filter(u => u.id !== user.id);
        setUsers(newUsers);
        calculateStats(newUsers);
        alert("ลบผู้ใช้สำเร็จ");
      } catch (err) {
        console.error("Delete user error:", err);
        alert("ลบผู้ใช้ไม่สำเร็จ: " + (err.response?.data?.detail || "เกิดข้อผิดพลาด"));
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้งาน</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง</p>
        </div>
        {/* ✅ แสดงสถานะ Real-time */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          อัพเดทอัตโนมัติทุก 30 วินาที
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">ผู้ใช้ทั้งหมด</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">ผู้ดูแลระบบ</p>
              <p className="text-3xl font-bold">{stats.admin}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm mb-1">พนักงาน</p>
              <p className="text-3xl font-bold">{stats.staff}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">ออนไลน์</p>
              <p className="text-3xl font-bold">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h2 className="text-base font-semibold text-gray-800">ค้นหาและกรองผู้ใช้</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ หรือ อีเมล..."
                className="border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <select
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">ทุกสิทธิ์</option>
              <option value="admin">ผู้ดูแลระบบ</option>
              <option value="staff">พนักงาน</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="font-semibold text-gray-800 text-sm">รายการผู้ใช้งาน</h3>
          </div>
          <div className="text-sm text-gray-600">
            แสดง <span className="font-semibold text-gray-800">{filteredUsers.length}</span> รายการ
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">ผู้ใช้</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">อีเมล</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">สิทธิ์</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">สถานะ</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">เข้าสู่ระบบล่าสุด</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">วันที่สร้าง</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700 w-48">จัดการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">ไม่พบผู้ใช้</p>
                        <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยนเงื่อนไขการค้นหา</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {filteredUsers.map((user) => {
                const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
                const initial = fullName.charAt(0).toUpperCase();
                const isAdmin = user.is_superuser;
                const isOnline = user.is_online;

                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {initial}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{fullName}</p>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{user.email}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          ผู้ดูแลระบบ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          พนักงาน
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          isOnline
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isOnline ? (
                          <>
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            ออนไลน์
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            ออฟไลน์
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 text-xs">
                      {formatDate(user.last_login)}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 text-xs">
                      {formatDate(user.date_joined)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-medium flex items-center gap-1 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          แก้ไข
                        </button>
                        
                        <button
                          onClick={() => handleDelete(user)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-medium flex items-center gap-1 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal แก้ไขผู้ใช้ */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">แก้ไขข้อมูลผู้ใช้</h2>
                  <p className="text-blue-100 text-sm mt-1">@{selectedUser.username}</p>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  ข้อมูลพื้นฐาน
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อผู้ใช้</label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">อีเมล</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อจริง</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">นามสกุล</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  สิทธิ์การใช้งาน
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={editForm.is_staff}
                      onChange={(e) => setEditForm({ ...editForm, is_staff: e.target.checked })}
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">Staff (พนักงาน)</p>
                      <p className="text-sm text-gray-500">สิทธิ์พื้นฐานในการใช้งานระบบ</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={editForm.is_superuser}
                      onChange={(e) => setEditForm({ ...editForm, is_superuser: e.target.checked })}
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">Superuser (เจ้าของร้าน/Admin)</p>
                      <p className="text-sm text-gray-500">สิทธิ์เต็มในการจัดการระบบทั้งหมด</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">คำเตือน</p>
                  <p className="text-sm text-amber-700 mt-1">
                    การเปลี่ยนสิทธิ์ผู้ใช้จะมีผลทันทีหลังจากบันทึก กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-medium flex items-center gap-2 shadow-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}