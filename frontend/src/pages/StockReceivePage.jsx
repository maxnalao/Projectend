// src/pages/StockReceivePage.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

export default function StockReceivePage() {
  const nav = useNavigate();

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("ชิ้น");
  const [category, setCategory] = useState("");

  const CATEGORY_OPTIONS = ["เครื่องดื่ม", "เครื่องปรุง", "อาหาร", "อื่นๆ"];
  const UNIT_OPTIONS = ["ชิ้น", "ขวด", "กล่อง", "ซอง", "แพ็ค", "ถุง", "กระป๋อง", "ลัง"];

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({ sku: false, name: false, category: false });

  useEffect(() => {
    if (!imageFile) { setImageUrl(""); return; }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const skuOk  = sku.trim().length > 0;
  const nameOk = name.trim().length > 0;
  const catOk  = category.trim().length > 0;

  const priceNum = price === "" ? 0 : Number(price);
  const stockNum = stock === "" ? 0 : Number(stock);
  const priceOk  = !Number.isNaN(priceNum) && priceNum >= 0;
  const stockOk  = !Number.isNaN(stockNum) && stockNum >= 0;

  const canSubmit = skuOk && nameOk && catOk && priceOk && stockOk && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const fd = new FormData();
    fd.append("sku", sku.trim());
    fd.append("name", name.trim());
    fd.append("price", String(priceNum));
    fd.append("stock", String(stockNum));
    fd.append("unit", unit.trim() || "ชิ้น");
    fd.append("category", category);
    if (imageFile) fd.append("image", imageFile);

    setSaving(true);
    try {
      await api.post("/products/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      alert("เพิ่มสินค้าสำเร็จ!");
      nav("/stock", { replace: true, state: { justAdded: true } });
    } catch (err) {
      console.error(err);
      alert("บันทึกสินค้าไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const invalidClass = (isOk, field) =>
    (!isOk && touched[field]) ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "";

  return (
    <section className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => nav("/stock")}
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

      {/* Form */}
      <form onSubmit={submit}>
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
                      รหัสสินค้า <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, sku: true }))}
                      className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${invalidClass(skuOk, "sku")}`}
                      placeholder="เช่น A100"
                    />
                    {!skuOk && touched.sku && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        กรุณากรอกรหัสสินค้า
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ชื่อสินค้า <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${invalidClass(nameOk, "name")}`}
                      placeholder="เช่น โค้ก 500 มล."
                    />
                    {!nameOk && touched.name && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        กรุณากรอกชื่อสินค้า
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Price & Quantity Card */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">ราคาและจำนวน</h2>
                    <p className="text-xs text-gray-500">กำหนดราคาและจำนวนเริ่มต้น</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ราคาต่อหน่วย (฿)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className={`w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${priceOk ? "" : "border-red-300"}`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      จำนวนเริ่มต้น
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${stockOk ? "" : "border-red-300"}`}
                      placeholder="0"
                    />
                  </div>
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
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, category: true }))}
                      className={`w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${invalidClass(catOk, "category")}`}
                    >
                      <option value="">เลือกหมวดหมู่</option>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {!catOk && touched.category && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        กรุณาเลือกหมวดหมู่
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      หน่วยสินค้า
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
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
                  {imageUrl ? (
                    <div className="space-y-4">
                      <img
                        src={imageUrl}
                        alt="preview"
                        className="w-full h-64 object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl("");
                          setImageFile(null);
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
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    id="imageInput"
                  />
                  {!imageUrl && (
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

        {/* Action Buttons */}
        <div className="bg-white rounded-xl border shadow-sm p-6 mt-6">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => nav("/stock")}
              disabled={saving}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-colors ${
                !canSubmit
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังบันทึก...
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
    </section>
  );
}