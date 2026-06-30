# ตารางแผนงานการปฏิบัติงาน

เว็บแอปจัดการตารางแผนงาน เก็บข้อมูลใน Google Sheets ผ่าน Google Apps Script เป็น backend ส่วนหน้าเว็บ host ฟรีบน GitHub Pages

## โครงสร้างไฟล์
```
index.html          → หน้า login (กรอกรหัสพนักงาน)
calendar.html        → หน้าแรกพนักงาน (ปฏิทิน + คำขอแผนงาน)
admin.html           → หน้าแอดมิน (อนุมัติ/จัดการพนักงาน)
css/style.css        → สไตล์รวมทุกหน้า
js/api.js            → ฟังก์ชันเรียก Apps Script API + จัดการ session
js/login.js          → ตรรกะหน้า login
js/calendar.js        → ตรรกะหน้าปฏิทิน
js/admin.js           → ตรรกะหน้าแอดมิน
apps-script/Code.gs           → โค้ด backend วางใน Google Apps Script
apps-script/SHEET_SETUP.md    → วิธีสร้าง Google Sheet และ deploy
```

## ขั้นตอนติดตั้ง (เรียงตามลำดับ)

1. ทำตาม `apps-script/SHEET_SETUP.md` เพื่อสร้าง Google Sheet สองแท็บ (Users, Plans) และ deploy Apps Script ให้ได้ URL
2. เปิดไฟล์ `js/api.js` แก้บรรทัด `const API_URL = '...'` ให้เป็น URL ที่ได้จากขั้นตอนที่ 1
3. สร้าง repository ใหม่บน GitHub เช่นชื่อ `work-plan-app` แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (ยกเว้นโฟลเดอร์ apps-script ไม่จำเป็นต้องอัปโหลดก็ได้ เพราะใช้แค่คัดลอกโค้ดไปวางใน Apps Script)
4. เข้า Settings > Pages ของ repo เลือก branch `main` โฟลเดอร์ `/ (root)` แล้วกด Save
5. รอสักครู่จะได้ลิงก์เว็บรูปแบบ `https://ชื่อบัญชี.github.io/work-plan-app/`
6. เพิ่มรหัสพนักงานคนแรก (ตัวเอง ตั้ง role เป็น admin) ลงใน Sheet `Users` ด้วยตัวเองโดยตรงในชีตก่อน เพื่อใช้ login เข้าหน้าแอดมินครั้งแรก หลังจากนั้นค่อยเพิ่มคนอื่นผ่านหน้าแอดมินได้เลย

## วิธีอัปเดตแอปภายหลัง

แต่ละไฟล์แยกหน้าที่ชัดเจน อยากแก้ส่วนไหนแก้ไฟล์นั้นไฟล์เดียว เช่น
- แก้ดีไซน์/สี → แก้ `css/style.css` ไฟล์เดียว
- แก้ field ในฟอร์มเพิ่มแผนงาน → แก้ `calendar.html` (ส่วน modal) และ `js/calendar.js`
- แก้ logic อนุมัติ/ปฏิเสธ → แก้ `js/admin.js`
- เพิ่ม action ใหม่ใน backend → แก้ `apps-script/Code.gs` แล้ว deploy ใหม่ (New deployment ทุกครั้งที่แก้ Apps Script)
