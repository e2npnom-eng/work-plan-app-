# โครงสร้าง Google Sheet ที่ต้องสร้างเอง

สร้าง Google Sheet ใหม่ 1 ไฟล์ ตั้งชื่อ เช่น "WorkPlanDB" แล้วสร้าง 2 แท็บ (sheet tabs) ตามนี้ พิมพ์หัวคอลัมน์ตามนี้เป๊ะๆ ในแถวที่ 1 (ตัวพิมพ์เล็ก-ใหญ่มีผล)

## แท็บ 1: Users
| empId | name | role |
|-------|------|------|
| 64001 | สมชาย ใจดี | employee |
| 9999  | ผู้ดูแลระบบ | admin |

- empId = รหัสพนักงาน (ใช้ login)
- role ใส่ได้แค่ `employee` หรือ `admin` เท่านั้น

## แท็บ 2: Plans
| id | date | startTime | endTime | task | pchg | chchg | team | location | outageDetail | empId | empName | status | cancelReason | createdAt |
|----|------|-----------|---------|------|------|-------|------|----------|---------------|-------|---------|--------|--------------|-----------|

แถวแรกพิมพ์หัวตามนี้เท่านั้น ไม่ต้องใส่ข้อมูล ระบบจะเติมให้เองเวลามีการเพิ่มแผนงานจากหน้าเว็บ

- status มีค่าได้: รออนุมัติ / อนุมัติแล้ว / ปฏิเสธ / ยกเลิก
- pchg / chchg = พชง. / ชชง.

## ขั้นตอนติดตั้ง Apps Script

1. เปิด Google Sheet ที่สร้างไว้ > เมนู Extensions > Apps Script
2. ลบโค้ดเดิมในไฟล์ Code.gs ทั้งหมด แล้ววางโค้ดจากไฟล์ `apps-script/Code.gs` ในโปรเจกต์นี้แทน
3. กด Deploy > New deployment > เลือกประเภท "Web app"
4. ตั้งค่า Execute as = Me, Who has access = Anyone
5. กด Deploy แล้วคัดลอก URL ที่ได้ (ลงท้ายด้วย /exec)
6. นำ URL ไปวางใน `js/api.js` ตรงตัวแปร `API_URL`
