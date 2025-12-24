// src/pages/ProfilePage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext"; // ✅ เพิ่ม
import api from "../api";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { refreshUser } = useUser(); // ✅ เพิ่ม
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  
  // สำหรับจัดการรูปโปรไฟล์
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // โหลดข้อมูลผู้ใช้จริง
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/auth/user/"); // ✅ เพิ่ม /api
      setUser(data);
      setForm(data);
      // โหลดรูปโปรไฟล์ถ้ามี
      if (data.profile_image) {
        // ถ้าเป็น URL เต็มใช้ตรงๆ, ถ้าเป็น path ต่อกับ BASE_URL
        const imageUrl = data.profile_image.startsWith('http') 
          ? data.profile_image 
          : `${api.defaults.baseURL}${data.profile_image}`;
        setImagePreview(imageUrl);
      }
    } catch (err) {
      console.error("Load profile error:", err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // จัดการเลือกไฟล์รูปภาพ
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // ตรวจสอบประเภทไฟล์
      if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
      }
      
      // ตรวจสอบขนาดไฟล์ (จำกัดที่ 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB');
        return;
      }

      setProfileImage(file);
      
      // สร้าง preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // อัปโหลดรูปโปรไฟล์
const handleUploadImage = async () => {
  if (!profileImage) {
    alert("กรุณาเลือกรูปก่อน");
    return;
  }

  setUploadingImage(true);
  try {
    const formData = new FormData();
    formData.append('profile_image', profileImage);

    console.log("📤 Uploading file:", profileImage.name);
    console.log("📤 File size:", profileImage.size);
    console.log("📤 File type:", profileImage.type);

    const { data } = await api.patch("/auth/user/", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log("✅ Upload response:", data);
    console.log("✅ Profile image in response:", data.profile_image);

    setUser(data);
    setProfileImage(null);
    
    if (data.profile_image) {
      const imageUrl = data.profile_image.startsWith('http') 
        ? data.profile_image 
        : `http://127.0.0.1:8000${data.profile_image}`;
      console.log("✅ Full image URL:", imageUrl);
      setImagePreview(imageUrl);
    } else {
      console.error("❌ No profile_image in response!");
    }
    
    alert("อัปโหลดรูปโปรไฟล์สำเร็จ");
    await refreshUser();
  } catch (err) {
    console.error("❌ Upload error:", err);
    console.error("❌ Error response:", err.response?.data);
    console.error("❌ Error status:", err.response?.status);
    alert("อัปโหลดรูปไม่สำเร็จ: " + (err.response?.data?.detail || err.message || "เกิดข้อผิดพลาด"));
  } finally {
    setUploadingImage(false);
  }
};

  const handleCancel = () => {
    setForm({ ...user });
    setIsEditing(false);
    setProfileImage(null);
    if (user?.profile_image) { // ✅ เพิ่ม optional chaining
      const imageUrl = user.profile_image.startsWith('http') 
        ? user.profile_image 
        : `${api.defaults.baseURL}${user.profile_image}`;
      setImagePreview(imageUrl);
    } else {
      setImagePreview(null);
    }
  };

  const handleLogout = () => {
    if (window.confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
      localStorage.clear();
      navigate("/login", { replace: true });
    }
  };
// ลบรูปโปรไฟล์
const handleRemoveImage = async () => {
  if (!window.confirm("ต้องการลบรูปโปรไฟล์ใช่หรือไม่?")) return;

  setUploadingImage(true);
  try {
    const { data } = await api.patch("/auth/user/", {
      profile_image: null,
    });

    console.log("✅ Remove response:", data);

    setUser(data);
    setImagePreview(null);
    setProfileImage(null);
    alert("ลบรูปโปรไฟล์สำเร็จ");
    
    await refreshUser();
  } catch (err) {
    console.error("❌ Remove image error:", err);
    alert("ลบรูปไม่สำเร็จ: " + (err.response?.data?.detail || "เกิดข้อผิดพลาด"));
  } finally {
    setUploadingImage(false);
  }
};

// บันทึกข้อมูลผู้ใช้
const handleSave = async () => {
  setSaving(true);
  try {
    const { data } = await api.patch("/auth/user/", {
      username: form.username,
      email: form.email,
      first_name: form.first_name,
      last_name: form.last_name,
    });

    console.log("✅ Save response:", data);

    setUser(data);
    setIsEditing(false);
    alert("บันทึกข้อมูลสำเร็จ");
    
    await refreshUser();
  } catch (err) {
    console.error("❌ Update profile error:", err);
    alert("บันทึกไม่สำเร็จ: " + (err.response?.data?.detail || "เกิดข้อผิดพลาด"));
  } finally {
    setSaving(false);
  }
};
  // Loading state
  if (loading) {
    return (
      <section className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </section>
    );
  }

  // ถ้าไม่มีข้อมูล
  if (!user) {
    return (
      <section className="space-y-6 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 font-semibold">ไม่สามารถโหลดข้อมูลได้</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            กลับไปเข้าสู่ระบบ
          </button>
        </div>
      </section>
    );
  }

  // แสดงชื่อเต็ม
  const fullName = user.first_name && user.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user.username;

  // แสดงตัวอักษรแรก
  const initial = fullName.charAt(0).toUpperCase();

  // แปลง role
  const isAdmin = user.is_superuser || user.is_staff;
  const roleText = isAdmin ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน";
  const roleColor = isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <section className="space-y-6 max-w-4xl">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-gray-800">โปรไฟล์ของฉัน</h1>
            <p className="text-sm text-gray-500 mt-1">จัดการข้อมูลส่วนตัว</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            แก้ไขข้อมูล
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Avatar Section */}
        <div className="px-6 py-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center gap-6">
            {/* Avatar with upload button */}
            <div className="relative group">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl font-bold border-4 border-white/30 overflow-hidden">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              
              {/* Overlay buttons */}
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                    title="เปลี่ยนรูปโปรไฟล์"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  
                  {(imagePreview && user.profile_image) && (
                    <button
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                      className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
                      title="ลบรูปโปรไฟล์"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{fullName}</h2>
              <p className="text-blue-100 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {user.email}
              </p>
              <div className="mt-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${roleColor}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {roleText}
                </span>
              </div>
            </div>
          </div>

          {/* แสดงปุ่มอัปโหลดถ้ามีการเลือกรูปใหม่ */}
          {profileImage && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm flex-1">คุณได้เลือกรูปใหม่แล้ว กดบันทึกเพื่ออัปโหลด</p>
              <button
                onClick={handleUploadImage}
                disabled={uploadingImage}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
              >
                {uploadingImage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    กำลังอัปโหลด...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    บันทึกรูปภาพ
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Info Section - เหมือนเดิม */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ชื่อผู้ใช้ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ชื่อผู้ใช้
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  value={form.username || ""}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              ) : (
                <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-800">
                  {user.username}
                </div>
              )}
            </div>

            {/* อีเมล */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                อีเมล
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={form.email || ""}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              ) : (
                <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-800">
                  {user.email}
                </div>
              )}
            </div>

            {/* ชื่อจริง */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ชื่อจริง
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name || ""}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="ชื่อจริง"
                />
              ) : (
                <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-800">
                  {user.first_name || "-"}
                </div>
              )}
            </div>

            {/* นามสกุล */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                นามสกุล
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name || ""}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="นามสกุล"
                />
              ) : (
                <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-800">
                  {user.last_name || "-"}
                </div>
              )}
            </div>

            {/* สิทธิ์ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                สิทธิ์การใช้งาน
              </label>
              <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-800">
                {roleText}
              </div>
            </div>

            {/* วันที่สร้าง */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                วันที่สร้างบัญชี
              </label>
              <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-800">
                {formatDate(user.date_joined)}
              </div>
            </div>

            {/* เข้าสู่ระบบล่าสุด */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                เข้าสู่ระบบล่าสุด
              </label>
              <div className="px-4 py-2.5 bg-gray-50 rounded-lg text-gray-800">
                {formatDate(user.last_login)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
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
                    บันทึก
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-gray-800">ความปลอดภัย</h2>
              <p className="text-xs text-gray-500">จัดการรหัสผ่านและการเข้าสู่ระบบ</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <div className="text-left">
                <p className="font-semibold text-gray-800">เปลี่ยนรหัสผ่าน</p>
                <p className="text-xs text-gray-500">แก้ไขรหัสผ่านของคุณ</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <div className="text-left">
                <p className="font-semibold text-red-600">ออกจากระบบ</p>
                <p className="text-xs text-red-500">ออกจากบัญชีนี้</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}