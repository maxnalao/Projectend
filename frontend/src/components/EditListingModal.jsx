// src/components/EditListingModal.jsx
import { useEffect, useState } from "react";
import api from "../api";

const UNIT_OPTIONS = ["ชิ้น", "ขวด", "กล่อง", "ซอง", "แพ็ค", "ถุง", "กระป๋อง", "ลัง"];

export default function EditListingModal({ open, listing, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!listing) return;
    setTitle(listing.title || listing.product_name || listing.name || "");
    setSalePrice(
      listing.sale_price !== null && listing.sale_price !== undefined
        ? listing.sale_price
        : listing.selling_price ?? listing.price ?? ""
    );
    setUnit(listing.unit || listing.unit_display || "");
    setQuantity(listing.quantity ?? 0);
    setPreview(listing.image_url || "");
    setImage(null);
  }, [listing]);

  if (!open || !listing) return null;

  // ✅ ดึงค่าที่ถูกต้องจาก listing
  const productCode = listing.product_code || listing.code || "-";
  const productName = listing.product_name || listing.name || listing.title || "สินค้า";
  const categoryName = listing.category_name || listing.category || "-";

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", title ?? "");
      if (salePrice !== "" && salePrice !== null) fd.append("sale_price", salePrice);
      fd.append("unit", unit ?? "");
      fd.append("quantity", String(parseInt(quantity || 0, 10)));
      if (image) fd.append("image", image);

      const res = await api.patch(`/listings/${listing.id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.status === 200) {
        alert("บันทึกข้อมูลสำเร็จ!");
        onSaved?.();
      } else {
        const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        alert(`บันทึกไม่สำเร็จ (${res.status}) ${text}`);
      }
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      alert(`บันทึกไม่สำเร็จ (${status ?? "ERR"}) ${data ? JSON.stringify(data) : ""}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl transform transition-all">
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">แก้ไขรายการสินค้า</h2>
                <p className="text-xs text-gray-500">แก้ไขข้อมูลสินค้าที่แสดงในหน้ารายการ</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Form Fields (2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Read-only Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ข้อมูลอ้างอิง (อ่านอย่างเดียว)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">รหัสสินค้า</label>
                    {/* ✅ FIXED: ใช้ productCode ที่ดึงจาก product_code หรือ code */}
                    <input
                      value={productCode}
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">หมวดหมู่</label>
                    {/* ✅ FIXED: ใช้ categoryName */}
                    <input
                      value={categoryName}
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Editable Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  ข้อมูลที่แก้ไขได้
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ชื่อแสดง
                      <span className="text-gray-400 font-normal text-xs ml-1">(ว่างไว้ = ใช้ชื่อจากสต็อก)</span>
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder={productName}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ราคาขาย (฿)
                      <span className="text-gray-400 font-normal text-xs ml-1">(ว่างไว้ = ใช้ราคาจากสต็อก)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder={listing.selling_price || listing.price || "0.00"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      หน่วยแสดง
                      <span className="text-gray-400 font-normal text-xs ml-1">(ว่างไว้ = ใช้หน่วยจากสต็อก)</span>
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="">ใช้จากสต็อก</option>
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      จำนวนคงเหลือ
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Image Upload */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  รูปสำหรับหน้าแสดง
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
                  {preview ? (
                    <div className="space-y-3">
                      <img
                        src={preview}
                        alt="preview"
                        className="w-full h-56 object-contain rounded-lg bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreview("");
                          setImage(null);
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        ลบรูปภาพ
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">อัพโหลดรูปภาพใหม่</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP</p>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setImage(file || null);
                      if (file) setPreview(URL.createObjectURL(file));
                    }}
                    className="hidden"
                    id="editImageInput"
                  />
                  {!preview && (
                    <label
                      htmlFor="editImageInput"
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      เลือกรูปภาพ
                    </label>
                  )}
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <span className="font-semibold">หมายเหตุ:</span> ถ้าไม่อัพโหลดรูปใหม่ จะใช้รูปจากสต็อก
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-colors ${
                saving
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  บันทึกการแก้ไข
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}