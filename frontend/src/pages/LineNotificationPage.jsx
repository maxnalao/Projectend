// src/pages/LineNotificationPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function LineNotificationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lineProfile, setLineProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ ลิงก์บอทของคุณ
  const YOUR_LINE_LINK = "https://lin.ee/zARDyzU";

  useEffect(() => {
    loadUserInfo();
    checkConnection();
    const interval = setInterval(checkConnection, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadUserInfo = async () => {
    try {
      const { data } = await api.get("/auth/profile/");
      setCurrentUser(data);
    } catch (err) {
      console.error("Get user error:", err);
    }
  };

  const checkConnection = async () => {
    try {
      const { data: status } = await api.get("/line/get-user-id/");
      setConnected(status.has_user_id);

      if (status.has_user_id) {
        try {
          const { data: profile } = await api.get("/line/profile/");
          setLineProfile(profile);
        } catch (e) {
          console.error("Get profile error", e);
        }
      }
    } catch (err) {
      console.error("Connection check error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("คุณต้องการยกเลิกการเชื่อมต่อ LINE ใช่หรือไม่?")) return;
    try {
      await api.delete("/line/delete-user-id/");
      setConnected(false);
      setLineProfile(null);
      alert("ยกเลิกการเชื่อมต่อแล้ว");
      checkConnection();
    } catch (err) {
      console.error("Disconnect error:", err);
      alert("เกิดข้อผิดพลาด");
    }
  };

  const handleTestMessage = async () => {
    try {
      await api.post("/line/test/");
      alert("ส่งข้อความทดสอบเรียบร้อย! เช็คในไลน์ได้เลยครับ");
    } catch (err) {
      alert("ส่งไม่สำเร็จ: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <section className="max-w-2xl mx-auto space-y-6 p-4">
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
          <p className="text-sm text-gray-500">เชื่อมต่อเพื่อรับการแจ้งเตือนสต็อกสินค้า</p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* ✅ กรณี 1: เชื่อมต่อสำเร็จแล้ว */}
        {connected ? (
          <div className="p-8 text-center bg-gradient-to-b from-white to-green-50/30">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 relative shadow-inner">
              <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              <div className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-1.5 border-4 border-white shadow-sm">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-2">เชื่อมต่อ LINE เรียบร้อย</h2>
            
            {lineProfile && (
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-green-200 shadow-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-medium text-gray-700">บัญชี: {lineProfile.display_name}</span>
                </div>
              </div>
            )}

            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              ระบบพร้อมส่งการแจ้งเตือนสินค้าใกล้หมด และการเคลื่อนไหวสต็อกไปยัง LINE ของคุณแล้ว
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={handleTestMessage}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                ทดสอบส่งข้อความ
              </button>
              <button 
                onClick={handleDisconnect}
                className="px-6 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors flex items-center justify-center gap-2"
              >
                ยกเลิกการเชื่อมต่อ
              </button>
            </div>
          </div>
        ) : (
          /* ✅ กรณี 2: ยังไม่เชื่อมต่อ - แบบง่าย */
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">เชื่อมต่อ LINE Bot</h2>
              <p className="text-gray-500">เพิ่มเพื่อนและเชื่อมต่อง่ายๆ</p>
            </div>

            {/* ✅ ขั้นตอนการเชื่อมต่อ */}
            <div className="space-y-6 mb-8">
              {/* Step 1 */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">เพิ่มเพื่อน LINE Bot</h3>
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="bg-white p-3 rounded-lg border-2 border-dashed border-gray-300">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(YOUR_LINE_LINK)}`}
                        alt="Scan LINE QR" 
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-sm text-gray-600 mb-2">สแกน QR Code หรือ</p>
                      <a 
                        href={YOUR_LINE_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                        คลิกเพื่อเพิ่มเพื่อน
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">ส่งข้อความเชื่อมต่อ</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      พิมพ์ข้อความนี้ส่งให้บอท:
                    </p>
                    <div className="bg-white border-2 border-blue-300 rounded-lg p-4 font-mono text-lg text-center">
                      <span className="text-blue-600 font-bold">เชื่อม {currentUser?.username || '[username]'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      * ใช้ username ที่คุณ Login เข้าระบบ
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  ✓
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">เสร็จสิ้น!</h3>
                  <p className="text-sm text-gray-600">
                    เมื่อส่งข้อความแล้ว หน้านี้จะอัปเดตอัตโนมัติ และคุณจะเริ่มได้รับการแจ้งเตือน
                  </p>
                </div>
              </div>
            </div>

            {/* Auto refresh indicator */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-600">
                <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>กำลังตรวจสอบการเชื่อมต่อ...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">การแจ้งเตือนที่คุณจะได้รับ</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• สินค้าใกล้หมด (&lt; 5 ชิ้น)</li>
              <li>• สินค้าหมดสต็อก</li>
              <li>• การรับสินค้าเข้าคลัง</li>
              <li>• การเบิกสินค้าออก</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}