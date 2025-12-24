import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import BestSellerCard from "../components/BestSellerCard";
import FestivalCalendar from "../components/FestivalCalendar";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  
  const [data, setData] = useState({
    total_products: 0,
    low_stock_count: 0,
    low_stock_items: [],
    today_sales: { total_quantity: 0, total_transactions: 0 },
    upcoming_festivals: [],
    top_products_today: [],
  });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // ✅ FIXED - Remove /inventory from path
      const { data } = await api.get("/employee-dashboard/overview/");
      console.log('👨‍💼 Employee Dashboard Data:', data);
      setData(data);
    } catch (err) {
      console.error("Employee dashboard load error:", err?.response || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // แปลงวันที่
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', { 
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (err) {
      return '-';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                👨‍💼 Dashboard พนักงาน
              </h1>
              <p className="text-gray-600 mt-2">ยินดีต้อนรับ! ดูข้อมูลสต็อก การขายและเทศกาลที่มาถึง</p>
            </div>
            <button
              onClick={load}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              รีเฟรช
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Stats Cards - 4 กล่องสรุป */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: จำนวนสินค้า */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">📦 สินค้าทั้งหมด</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{data.total_products}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </div>

          {/* Card 2: Low Stock */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">⚠️ ของใกล้หมด</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{data.low_stock_count}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
            </div>
          </div>

          {/* Card 3: Today's Sales Qty */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">🛒 ขายวันนี้</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{data.today_sales.total_quantity}</p>
                <p className="text-xs text-gray-500 mt-1">ชิ้น</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🛒</span>
              </div>
            </div>
          </div>

          {/* Card 4: Transactions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">📊 ธุรกรรม</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{data.today_sales.total_transactions}</p>
                <p className="text-xs text-gray-500 mt-1">ครั้ง</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⚠️ สินค้าใกล้หมด</h2>
          {data.low_stock_items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-3">✅</div>
              <p className="text-gray-600 font-medium">ไม่มีสินค้าใกล้หมด</p>
              <p className="text-sm text-gray-500">สต็อกทุกรายการเพียงพอ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.low_stock_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">รหัส: {item.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">{item.stock}</p>
                    <p className="text-xs text-gray-600">{item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Best Sellers + Festival Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BestSellerCard period="month" limit={10} />
          <FestivalCalendar />
        </div>

        {/* Upcoming Festivals */}
        {data.upcoming_festivals.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🎉 เทศกาลที่มาถึง</h2>
            <div className="space-y-3">
              {data.upcoming_festivals.map((festival) => (
                <div key={festival.id} className="flex items-center p-4 bg-pink-50 border border-pink-200 rounded-lg">
                  <span className="text-4xl mr-4">{festival.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{festival.name}</p>
                    <p className="text-sm text-gray-600">{formatDate(festival.start_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Products Today */}
        {data.top_products_today.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 สินค้าขายดีวันนี้</h2>
            <div className="space-y-3">
              {data.top_products_today.map((product, idx) => (
                <div key={product.product__id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">#{idx + 1} {product.product__name}</p>
                    <p className="text-sm text-gray-600">{product.product__code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{product.qty}</p>
                    <p className="text-xs text-gray-600">ชิ้น</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-700 font-medium">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      )}
    </div>
  );
}