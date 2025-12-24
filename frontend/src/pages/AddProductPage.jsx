import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function AddProductPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    code: "",
    name: "",
    cost_price: "",      // ✅ NEW
    selling_price: "",   // ✅ NEW
    qty: "",
    category: "",
    unit: "ชิ้น",
    image: null,
  });
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    { value: "เครื่องดื่ม", label: "เครื่องดื่ม" },
    { value: "เครื่องปรุง", label: "เครื่องปรุง" },
    { value: "อาหาร", label: "อาหาร" },
    { value: "อื่นๆ", label: "อื่นๆ" },
  ];

  const units = ["ชิ้น", "ขวด", "กล่อง", "ซอง", "แพ็ค", "ถุง", "กระป๋อง", "ลัง"];

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((s) => ({ ...s, image: file }));
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.cost_price || !form.selling_price || !form.qty || !form.category) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("code", form.code || `A${Date.now().toString().slice(-3)}`);
      fd.append("name", form.name);
      fd.append("cost_price", String(form.cost_price));    // ✅ NEW
      fd.append("selling_price", String(form.selling_price)); // ✅ NEW
      fd.append("stock", String(form.qty));
      fd.append("unit", form.unit);
      fd.append("category_name", form.category);
      if (form.image) fd.append("image", form.image);

      const token = localStorage.getItem("access_token");
      await axios.post(`${API_BASE}/products/`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        withCredentials: false,
      });

      alert("เพิ่มสินค้าสำเร็จ!");
      navigate("/stock");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.statusText ||
        "เพิ่มสินค้าไม่สำเร็จ";
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/stock")}
            className="w-10 h-10 bg-white border rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">เพิ่มสินค้าใหม่</h1>
            <p className="text-sm text-gray-500 mt-1">เพิ่มสินค้าเข้าสู่คลัง</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form Fields (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">ข้อมูลพื้นฐาน</h2>
                    <p className="text-xs text-gray-500">รหัสและชื่อสินค้า</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      รหัสสินค้า
                      <span className="text-gray-400 font-normal ml-1">(ถ้าไม่ใส่จะสร้างอัตโนมัติ)</span>
                    </label>
                    <input
                      name="code"
                      value={form.code}
                      onChange={onChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="เช่น A100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ชื่อสินค้า <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={onChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="เช่น โค้ก 500 มล."
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Price Card - UPDATED */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">ราคา</h2>
                    <p className="text-xs text-gray-500">ราคาต้นทุนและราคาขาย</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ราคาต้นทุน (฿) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="cost_price"
                        value={form.cost_price}
                        onChange={onChange}
                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ราคาขาย (฿) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="selling_price"
                        value={form.selling_price}
                        onChange={onChange}
                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </div>
                {form.cost_price && form.selling_price && (
                  <div className="text-sm text-gray-600">
                    <p>กำไร: ฿{(parseFloat(form.selling_price) - parseFloat(form.cost_price)).toFixed(2)}</p>
                    <p>มาร์จิน: {form.selling_price > 0 ? (((parseFloat(form.selling_price) - parseFloat(form.cost_price)) / parseFloat(form.selling_price) * 100).toFixed(1)) : 0}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Card */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-cyan-50 to-blue-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10m8-10l-8-4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">จำนวน</h2>
                    <p className="text-xs text-gray-500">จำนวนเริ่มต้น</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    จำนวนเริ่มต้น <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="qty"
                    value={form.qty}
                    onChange={onChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="0"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Category & Unit Card */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">หมวดหมู่และหน่วย</h2>
                    <p className="text-xs text-gray-500">จัดหมวดหมู่และกำหนดหน่วยนับ</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      หมวดหมู่ <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={onChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      required
                    >
                      <option value="">เลือกหมวดหมู่</option>
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      หน่วยสินค้า <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="unit"
                      value={form.unit}
                      onChange={onChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      required
                    >
                      {units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Image Upload */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden sticky top-6">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">รูปสินค้า</h2>
                    <p className="text-xs text-gray-500">อัพโหลดรูปภาพ</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                  {preview ? (
                    <div className="space-y-4">
                      <img
                        src={preview}
                        alt="preview"
                        className="w-full h-64 object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreview(null);
                          setForm((s) => ({ ...s, image: null }));
                        }}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        ลบรูปภาพ
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">คลิกเพื่ออัพโหลดรูปภาพ</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP (Max 5MB)</p>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                    id="imageInput"
                  />
                  {!preview && (
                    <label
                      htmlFor="imageInput"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      เลือกรูปภาพ
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/stock")}
              disabled={submitting}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังเพิ่ม...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  เพิ่มสินค้า
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}