import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import BestSellerCard from "../components/BestSellerCard";
import FestivalCalendar from "../components/FestivalCalendar";
import { useUser } from "../context/UserContext";

export default function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  
  const [data, setData] = useState({
    total_products: 0,
    low_stock_count: 0,
    in_today: 0,
    out_today: 0,
    total_inventory_value: 0,
    low_stock_items: [],
    movements: [],
    category_stats: [],
  });
  const [loading, setLoading] = useState(false);
  
  // ✅ เช็คว่าเป็น Admin จาก user context
  const isAdmin = user?.is_staff || user?.is_superuser || false;

  const load = async () => {
    setLoading(true);
    try {
      const { data: dashboardData } = await api.get("/dashboard-stats/");
      
      // ✅ ดึง total stock จาก Listing API (เหมือน ProductsPage)
      try {
        const { data: listingsData } = await api.get("/listings/?active=1");
        const listingArr = Array.isArray(listingsData) ? listingsData : (listingsData.results ?? []);
        const totalStock = listingArr.reduce((sum, p) => {
          const qty = parseFloat(p.quantity) || 0;
          return sum + qty;
        }, 0);
        
        setData({
          ...dashboardData,
          total_products: totalStock  // ✅ แทนที่ด้วย Listing stock
        });
      } catch {
        setData(dashboardData);
      }
    } catch (err) {
      console.error("dashboard load error:", err?.response || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const COLORS = ['#f43f5e', '#3b82f6', '#eab308', '#10b981', '#8b5cf6', '#f97316', '#06b6d4'];

  const formatDateTime = (dateString) => {
    if (!dateString || dateString === 'Invalid Date') return '-';
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? '-' : date.toLocaleString('th-TH', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (err) { return '-'; }
  };

  const chartData = data.category_stats.map((stat, index) => ({
    name: stat.category || 'ไม่ระบุ',
    value: stat.count,
    stock: stat.total_stock,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ภาพรวมระบบ</h1>
          <p className="text-sm text-gray-500 mt-1">
            อัพเดทล่าสุด: {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          รีเฟรช
        </button>
      </div>

      {/* ✅ Stats Cards Section (Fixed Layout) - 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        
        {/* Card 1: Total Stock */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-5 flex items-center justify-between transition-transform hover:scale-[1.02]">
          <div>
            <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">จำนวนสินค้าคงเหลือ</p>
            <p className="text-white text-4xl font-bold mt-1">{data.total_products}</p>
            <p className="text-blue-100 text-xs mt-1">ชิ้นคงเหลือ</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
        </div>

        {/* Card 2: Low Stock Items */}
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md p-5 flex items-center justify-between transition-transform hover:scale-[1.02]">
          <div>
            <p className="text-amber-100 text-xs font-medium uppercase tracking-wider">สินค้าใกล้หมด</p>
            <p className="text-white text-4xl font-bold mt-1">{data.low_stock_count}</p>
            <p className="text-amber-100 text-xs mt-1">สต็อกต่ำกว่า 5 ชิ้น</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Card 3: In Today */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-md p-5 flex items-center justify-between transition-transform hover:scale-[1.02]">
          <div>
            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">การรับสินค้า (วันนี้)</p>
            <p className="text-white text-4xl font-bold mt-1">{data.in_today}</p>
            <p className="text-emerald-100 text-xs mt-1">ชิ้น</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        {/* Card 4: Out Today */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl shadow-md p-5 flex items-center justify-between transition-transform hover:scale-[1.02]">
          <div>
            <p className="text-rose-100 text-xs font-medium uppercase tracking-wider">การเบิกสินค้า (วันนี้)</p>
            <p className="text-white text-4xl font-bold mt-1">{data.out_today}</p>
            <p className="text-rose-100 text-xs mt-1">ชิ้น</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
        </div>
      </div>

      {/* Middle Section: Low Stock & Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[450px]">
          <div className="px-6 py-4 border-b bg-orange-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="font-bold text-gray-800 text-lg">แจ้งเตือนของใกล้หมด</h2>
          </div>
          <div className="p-4 overflow-y-auto" style={{ maxHeight: '340px' }}>
            {data.low_stock_items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-3">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="font-medium text-green-600">สต็อกทุกรายการเพียงพอ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.low_stock_items.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <div className="w-12 h-12 rounded-lg bg-white flex-shrink-0 overflow-hidden shadow-sm">
                      {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-gray-300"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" /></svg></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">รหัส: {item.code}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-red-600">{item.stock}</span>
                      <p className="text-[10px] text-red-400 font-medium">{item.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Movements History */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden min-h-[450px]">
          <div className="px-6 py-4 border-b bg-blue-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
              </div>
              <h2 className="font-bold text-gray-800 text-lg">สินค้าเข้า - ออก</h2>
            </div>
            <button onClick={() => navigate('/history')} className="text-xs font-bold text-blue-600 hover:underline">ดูทั้งหมด</button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 border-b sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-20">เวลา</th>
                  <th className="px-4 py-3 text-left font-semibold">สินค้า</th>
                  <th className="px-4 py-3 text-center font-semibold w-24">ประเภท</th>
                  <th className="px-4 py-3 text-right font-semibold w-20">จำนวน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.movements.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-gray-400">ยังไม่มีการเคลื่อนไหววันนี้</td></tr>
                ) : (
                  data.movements.slice(0, 6).map((mv) => (
                    <tr key={mv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{new Date(mv.date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 font-medium text-gray-700 min-w-[150px] max-w-[250px]">
                        <div className="line-clamp-2 break-words leading-tight">{mv.name}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${mv.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {mv.type === 'in' ? 'รับเข้า' : 'เบิกออก'}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${mv.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>{mv.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ Charts & Additional Widgets - แสดงแค่สำหรับ Admin */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BestSellerCard period="month" limit={4} />
          <FestivalCalendar />
        </div>
      )}

      {/* Category Stats Charts - แสดงแค่สำหรับ Admin */}
      {isAdmin && chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h2 className="font-bold text-lg text-gray-800">แดชบอร์ดสินค้า</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">สัดส่วนสินค้าตามหมวดหมู่</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                    {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                {chartData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="flex flex-col items-center">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">จำนวนสินค้าในแต่ละหมวดหมู่</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }} />
                  <Legend wrapperStyle={{ fontSize: '14px' }} />
                  <Bar dataKey="value" name="จำนวนสินค้า (รายการ)" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      )}
    </section>
  );
}