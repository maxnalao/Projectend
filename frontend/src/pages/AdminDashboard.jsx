// src/pages/AdminDashboard.jsx (UPDATED - SHOW COST PRICE)
import { useEffect, useState } from "react";
import api from "../api";

export default function AdminDashboard() {
  const [data, setData] = useState({
    total_inventory_value: 0,
    total_selling_value: 0,
    total_profit: 0,
    profit_margin: 0,
    total_products: 0,
    total_stock_items: 0,
  });
  
  const [breakdown, setBreakdown] = useState({
    categories: [],
  });
  
  const [topProducts, setTopProducts] = useState({
    top_products: [],
  });
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('financial');

  const load = async () => {
    setLoading(true);
    try {
      // ✅ FIXED - Remove /inventory from paths
      const financialRes = await api.get("/admin-dashboard/financial/");
      console.log('💰 Admin Financial Data:', financialRes.data);
      setData(financialRes.data);

      const categoryRes = await api.get("/admin-dashboard/category_breakdown/");
      console.log('📊 Category Breakdown:', categoryRes.data);
      setBreakdown(categoryRes.data);

      const topRes = await api.get("/admin-dashboard/top_products/");
      console.log('🏆 Top Products:', topRes.data);
      setTopProducts(topRes.data);
    } catch (err) {
      console.error("Admin dashboard load error:", err?.response || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                👑 Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">การวิเคราะห์ทางการเงินและสต็อก</p>
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
        
        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Inventory Value */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
            <p className="text-blue-100 text-sm font-medium mb-2">💰 Inventory Value</p>
            <p className="text-4xl font-bold mb-1">{formatCurrency(data.total_inventory_value)}</p>
            <p className="text-blue-100 text-xs">ราคาต้นทุนทั้งหมด</p>
          </div>

          {/* Selling Value */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
            <p className="text-green-100 text-sm font-medium mb-2">💵 Selling Value</p>
            <p className="text-4xl font-bold mb-1">{formatCurrency(data.total_selling_value)}</p>
            <p className="text-green-100 text-xs">หากขายได้ทั้งหมด</p>
          </div>

          {/* Total Profit */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
            <p className="text-purple-100 text-sm font-medium mb-2">📈 Total Profit</p>
            <p className="text-4xl font-bold mb-1">{formatCurrency(data.total_profit)}</p>
            <p className="text-purple-100 text-xs">({data.profit_margin?.toFixed(1)}%)</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">📦 Total Products</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">{data.total_products}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">📊 Total Stock Items</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">{data.total_stock_items}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('category')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                activeTab === 'category'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Category Breakdown
            </button>
            <button
              onClick={() => setActiveTab('top_products')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                activeTab === 'top_products'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏆 Top Products
            </button>
          </div>

          <div className="p-6">
            {/* Category Breakdown Tab */}
            {activeTab === 'category' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Categories by Stock Value</h3>
                {breakdown.categories && breakdown.categories.length > 0 ? (
                  <div className="space-y-4">
                    {breakdown.categories.map((cat, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold text-gray-900">{cat.name}</p>
                            <p className="text-sm text-gray-600">
                              {cat.product_count} products | {cat.total_stock} items
                            </p>
                          </div>
                          <p className="font-bold text-blue-600">{cat.total_stock || 0} units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No category data available
                  </div>
                )}
              </div>
            )}

            {/* Top Products Tab */}
            {activeTab === 'top_products' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top 20 Products by Inventory Value</h3>
                {topProducts.top_products && topProducts.top_products.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Code</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Stock</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Cost Price</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Sell Price</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Profit/Unit</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700">Inventory Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {topProducts.top_products.map((product, idx) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600 font-bold">{idx + 1}</td>
                            <td className="px-4 py-3 text-gray-900 font-semibold">{product.name}</td>
                            <td className="px-4 py-3 text-gray-600">{product.code}</td>
                            <td className="px-4 py-3 text-right text-gray-900">{product.stock}</td>
                            {/* ✅ ADDED - Cost Price */}
                            <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                              {formatCurrency(product.cost_price || 0)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                              {formatCurrency(product.price || 0)}
                            </td>
                            {/* ✅ ADDED - Profit per unit */}
                            <td className="px-4 py-3 text-right">
                              <span className={`font-semibold ${
                                (Number(product.price || 0) - Number(product.cost_price || 0)) > 0 ? 'text-emerald-600' :
                                (Number(product.price || 0) - Number(product.cost_price || 0)) < 0 ? 'text-rose-600' :
                                'text-gray-600'
                              }`}>
                                {formatCurrency(Number(product.price || 0) - Number(product.cost_price || 0))}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-blue-600">
                              {formatCurrency(product.inventory_value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No product data available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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