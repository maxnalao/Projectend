// src/pages/LineNotificationPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function LineNotificationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCurrentUserConnected, setIsCurrentUserConnected] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ ลิงก์บอทของคุณ
  const YOUR_LINE_LINK = "https://lin.ee/zARDyzU";

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // ดึงข้อมูล user ปัจจุบัน
      const { data: profile } = await api.get("/auth/user/");
      setCurrentUser(profile);

      // เช็คว่า user ปัจจุบันเชื่อมต่อ LINE หรือยัง
      const { data: status } = await api.get("/line/get-user-id/");
      setIsCurrentUserConnected(status.has_user_id);

      // ดึงรายชื่อทุกคนที่เชื่อมต่อ LINE แล้ว
      const { data: users } = await api.get("/line/connected-users/");
      setConnectedUsers(users.users || []);
    } catch (err) {
      console.error("Load data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === connectedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(connectedUsers.map((u) => u.id));
    }
  };

  const handleSendTestToSelected = async () => {
    if (selectedUsers.length === 0) {
      alert("กรุณาเลือกผู้รับอย่างน้อย 1 คน");
      return;
    }

    setSendingTest(true);
    try {
      const { data } = await api.post("/line/send-to-users/", {
        user_ids: selectedUsers,
        message: "🔔 ทดสอบการแจ้งเตือนจากระบบ EasyStock",
      });
      alert(`ส่งข้อความสำเร็จ ${data.sent_count} คน!`);
    } catch (err) {
      alert("ส่งไม่สำเร็จ: " + (err.response?.data?.error || err.message));
    } finally {
      setSendingTest(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("คุณต้องการยกเลิกการเชื่อมต่อ LINE ใช่หรือไม่?")) return;
    try {
      await api.delete("/line/delete-user-id/");
      setIsCurrentUserConnected(false);
      loadData();
      alert("ยกเลิกการเชื่อมต่อแล้ว");
    } catch (err) {
      console.error("Disconnect error:", err);
      alert("เกิดข้อผิดพลาด");
    }
  };

  const filteredUsers = connectedUsers.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <section className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white border rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">การแจ้งเตือนผ่าน LINE</h1>
          <p className="text-sm text-gray-500">จัดการการแจ้งเตือนและเลือกผู้รับ</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{connectedUsers.length}</p>
              <p className="text-sm text-gray-500">เชื่อมต่อแล้ว</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{selectedUsers.length}</p>
              <p className="text-sm text-gray-500">เลือกแล้ว</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCurrentUserConnected ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <svg className={`w-6 h-6 ${isCurrentUserConnected ? 'text-green-600' : 'text-yellow-600'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">สถานะของคุณ</p>
              <p className={`text-sm ${isCurrentUserConnected ? 'text-green-600' : 'text-yellow-600'}`}>
                {isCurrentUserConnected ? '✓ เชื่อมต่อแล้ว' : '○ ยังไม่เชื่อมต่อ'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Section - แสดงเฉพาะเมื่อยังไม่เชื่อมต่อ */}
      {!isCurrentUserConnected && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-shrink-0">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(YOUR_LINE_LINK)}`}
                  alt="LINE QR Code"
                  className="w-28 h-28"
                />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-gray-800 mb-2">เชื่อมต่อบัญชีของคุณ</h3>
              <p className="text-sm text-gray-600 mb-3">
                สแกน QR Code หรือคลิกปุ่มเพื่อเพิ่มเพื่อน แล้วพิมพ์:
              </p>
              <div className="inline-block bg-white border-2 border-green-300 rounded-lg px-4 py-2 font-mono text-green-700 font-bold mb-3">
                เชื่อม {currentUser?.username || '[username]'}
              </div>
              <div>
                <a
                  href={YOUR_LINE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  เพิ่มเพื่อน LINE Bot
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected Users List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <h2 className="text-lg font-bold text-gray-800">
              👥 รายชื่อผู้เชื่อมต่อ LINE ({connectedUsers.length} คน)
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSelectAll}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                {selectedUsers.length === connectedUsers.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
            </div>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="font-medium">ยังไม่มีผู้เชื่อมต่อ LINE</p>
            <p className="text-sm mt-1">แชร์ลิงก์ให้ทีมงานเพื่อเชื่อมต่อ</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleSelectUser(user.id)}
                className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                  selectedUsers.includes(user.id)
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedUsers.includes(user.id)
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedUsers.includes(user.id) && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden">
                  {user.picture_url ? (
                    <img src={user.picture_url} alt={user.display_name} className="w-full h-full object-cover" />
                  ) : (
                    user.display_name?.charAt(0) || user.username?.charAt(0) || '?'
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {user.display_name || user.username}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    @{user.username}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-green-600 font-medium">เชื่อมต่อแล้ว</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Bar */}
        {connectedUsers.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <p className="text-sm text-gray-600">
                เลือกแล้ว <span className="font-bold text-blue-600">{selectedUsers.length}</span> จาก {connectedUsers.length} คน
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSendTestToSelected}
                  disabled={selectedUsers.length === 0 || sendingTest}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedUsers.length === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {sendingTest ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      ส่งข้อความทดสอบ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Section - แสดงเฉพาะเมื่อเชื่อมต่อแล้ว */}
      {isCurrentUserConnected && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4">⚙️ การตั้งค่าของคุณ</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors"
            >
              ยกเลิกการเชื่อมต่อ LINE ของฉัน
            </button>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">การแจ้งเตือนอัตโนมัติ</h3>
            <p className="text-sm text-blue-800 mb-2">
              ระบบจะส่งแจ้งเตือนให้ <strong>ทุกคน</strong> ที่เชื่อมต่อ LINE เมื่อ:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• สินค้าใกล้หมด (&lt; 5 ชิ้น)</li>
              <li>• สินค้าหมดสต็อก</li>
              <li>• มีการรับสินค้าเข้าคลัง</li>
              <li>• มีการเบิกสินค้าออก</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}