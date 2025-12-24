from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError, LineBotApiError
from linebot.models import TextSendMessage, FlexSendMessage
import logging

logger = logging.getLogger(__name__)

class LineMessagingService:
    """
    Service สำหรับส่งข้อความผ่าน LINE Messaging API
    """
    
    def __init__(self, channel_access_token, channel_secret):
        self.line_bot_api = LineBotApi(channel_access_token)
        self.handler = WebhookHandler(channel_secret)
    
    def send_text_message(self, user_id, message):
        try:
            self.line_bot_api.push_message(
                user_id,
                TextSendMessage(text=message)
            )
            return {"success": True, "message": "Sent successfully"}
        except LineBotApiError as e:
            logger.error(f"LINE API Error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Send message error: {e}")
            return {"success": False, "error": str(e)}
    
    def send_low_stock_alert(self, user_id, product_name, product_code, stock, unit):
        message = f"""⚠️ แจ้งเตือน: สินค้าใกล้หมด!

📦 สินค้า: {product_name}
🔖 รหัส: {product_code}
📊 คงเหลือ: {stock} {unit}

กรุณาเติมสินค้าโดยเร็ว!"""
        return self.send_text_message(user_id, message)
    
    def send_out_of_stock_alert(self, user_id, product_name, product_code):
        message = f"""🚨 แจ้งเตือน: สินค้าหมดสต็อก!

📦 สินค้า: {product_name}
🔖 รหัส: {product_code}
📊 คงเหลือ: 0 ชิ้น

⚡ จำเป็นต้องเติมสต็อกด่วน!"""
        return self.send_text_message(user_id, message)
    
    def send_stock_in_notification(self, user_id, product_name, product_code, quantity, unit):
        message = f"""✅ รับสินค้าเข้าสต็อก

📦 สินค้า: {product_name}
🔖 รหัส: {product_code}
📥 จำนวน: {quantity} {unit}

บันทึกเรียบร้อยแล้ว"""
        return self.send_text_message(user_id, message)
    
    def send_stock_out_notification(self, user_id, product_name, product_code, quantity, unit, issued_by):
        message = f"""📤 เบิกสินค้าออก

📦 สินค้า: {product_name}
🔖 รหัส: {product_code}
📤 จำนวน: {quantity} {unit}
👤 ผู้เบิก: {issued_by}

บันทึกเรียบร้อยแล้ว"""
        return self.send_text_message(user_id, message)
    
    def send_test_message(self, user_id):
        message = """🎉 ทดสอบการแจ้งเตือน LINE Messaging API

✅ การเชื่อมต่อสำเร็จ!
📱 ระบบ EasyStock พร้อมใช้งาน

คุณจะได้รับการแจ้งเตือนเมื่อ:
• สินค้าใกล้หมด (< 5 ชิ้น)
• สินค้าหมดสต็อก
• มีการรับสินค้าเข้า
• มีการเบิกสินค้าออก"""
        return self.send_text_message(user_id, message)
    
    def send_flex_message(self, user_id, alt_text, contents):
        try:
            flex_message = FlexSendMessage(
                alt_text=alt_text,
                contents=contents
            )
            self.line_bot_api.push_message(user_id, flex_message)
            return {"success": True, "message": "Flex message sent"}
        except LineBotApiError as e:
            logger.error(f"LINE API Error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Send flex message error: {e}")
            return {"success": False, "error": str(e)}
    
    def get_profile(self, user_id):
        try:
            profile = self.line_bot_api.get_profile(user_id)
            return {
                "success": True,
                "data": {
                    "user_id": profile.user_id,
                    "display_name": profile.display_name,
                    "picture_url": profile.picture_url,
                    "status_message": profile.status_message
                }
            }
        except LineBotApiError as e:
            logger.error(f"Get profile error: {e}")
            return {"success": False, "error": str(e)}
        