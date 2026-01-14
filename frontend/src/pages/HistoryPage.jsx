// src/pages/HistoryPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ movements: [], total: 0, showing: 0 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    start_date: '',
    end_date: '',
    type: 'all',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.type !== 'all') params.append('type', filters.type);
      
      // ✅ เพิ่ม limit parameter
      params.append('limit', itemsPerPage);
      
      const { data } = await api.get(`/movement-history/?${params.toString()}`);
      setData(data);
      setCurrentPage(1); // รีเซ็ตหน้าเมื่อค้นหาใหม่
    } catch (err) {
      console.error("Load history error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', start_date: '', end_date: '', type: 'all' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      return date.toLocaleString('th-TH', { 
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  // คำนวณจำนวนหน้า
  const totalPages = Math.ceil(data.total / itemsPerPage);
  
  // ตัวอักษรแสดงหน้า
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const goToPreviousPage = () => {
    if (canGoPrevious) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToNextPage = () => {
    if (canGoNext) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white border rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ประวัติการเคลื่อนไหวสินค้า</h1>
          <p className="text-sm text-gray-500 mt-1">รายการรับเข้าและเบิกออกทั้งหมด</p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-800">ตัวกรองข้อมูล</h2>
            <p className="text-xs text-gray-500">ค้นหาและกรองรายการตามเงื่อนไข</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ค้นหา */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              ค้นหา
            </label>
            <input
              type="text"
              placeholder="รหัส หรือ ชื่อสินค้า"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* วันที่เริ่มต้น */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* วันที่สิ้นสุด */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* ประเภท */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              ประเภท
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="all">ทั้งหมด</option>
              <option value="in">รับเข้า</option>
              <option value="out">เบิกออก</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {!loading && (
              <span className="font-medium">
                รวมทั้งสิ้น <span className="text-blue-600 font-bold">{data.total}</span> รายการ
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              ล้างตัวกรอง
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              ค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-800">รายการทั้งหมด</h2>
                <p className="text-xs text-gray-500">ประวัติการรับเข้าและเบิกออกสินค้า</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">วันที่และเวลา</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">รหัส</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-700">สินค้า</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">ประเภท</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-700">จำนวน</th>
                {/* ✅ เพิ่มคอลัมน์ผู้ดำเนินการ */}
                <th className="px-6 py-4 text-left font-semibold text-gray-700">ผู้ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
                      <p className="text-sm text-gray-400 mt-1">โปรดรอสักครู่</p>
                    </div>
                  </td>
                </tr>
              ) : data.movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <p className="text-gray-500 font-semibold text-lg">ไม่พบรายการ</p>
                      <p className="text-sm text-gray-400 mt-2">ลองเปลี่ยนเงื่อนไขการค้นหาใหม่</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.movements.map((mv) => (
                  <tr key={mv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-600 font-medium">{formatDateTime(mv.date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                        {mv.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-medium">{mv.name}</td>
                    <td className="px-6 py-4 text-center">
                      {mv.type === "out" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                          เบิกออก
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                          </svg>
                          รับเข้า
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-800 text-lg">{mv.qty}</span>
                      <span className="text-sm text-gray-500 ml-1">{mv.unit}</span>
                    </td>
                    {/* ✅ คอลัมน์ผู้ดำเนินการ พร้อมรูปโปรไฟล์ */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* รูปโปรไฟล์ */}
                        {mv.profile_image ? (
                          <img 
                            src={mv.profile_image} 
                            alt={mv.created_by_name || 'User'} 
                            className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${
                            mv.created_by_name && mv.created_by_name !== 'ไม่ระบุ' 
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                              : 'bg-gray-400'
                          }`}>
                            {mv.created_by_name ? mv.created_by_name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                        {/* ชื่อและ username */}
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {mv.created_by_name || 'ไม่ระบุ'}
                          </p>
                          {mv.created_by_username && mv.created_by_username !== mv.created_by_name && (
                            <p className="text-xs text-gray-500">@{mv.created_by_username}</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        {!loading && data.movements.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                แสดง <span className="font-semibold text-gray-800">{Math.min(itemsPerPage, data.movements.length)}</span> รายการ 
                จากทั้งหมด <span className="font-semibold text-gray-800">{data.total}</span> รายการ
              </p>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600">
                    หน้า <span className="font-semibold text-gray-800">{currentPage}</span> / <span className="font-semibold text-gray-800">{totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={goToPreviousPage}
                      disabled={!canGoPrevious}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      ก่อนหน้า
                    </button>
                    <button
                      onClick={goToNextPage}
                      disabled={!canGoNext}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      ถัดไป
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}