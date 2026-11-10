# Thiết Kế Tính Năng: Hệ Thống Lịch Trực Bác Sĩ (Medical Duty Shifts)

**Ngày tạo:** 2026-11-09  
**Quy mô:** Thay đổi nhỏ / Bổ sung tính năng chuyên biệt (Small Change)

## 1. Mục đích & Lý do (Intent & Why)
Phục vụ đặc thù công việc của bác sĩ có lịch trực phân công ngẫu nhiên theo tháng: giúp chấm lịch trực cực nhanh và làm nổi bật các ngày có ca trực hoặc ra trực trên mọi màn hình (Tháng, Tuần, Hôm nay) để cân đối khối lượng việc cá nhân.

## 2. Mục tiêu, Phi mục tiêu & Điều cần tránh (Goals, Non-Goals, Anti-Goals)
- **Mục tiêu:**
  - Hỗ trợ 5 loại ca trực: `shift_24h` (**Trực 24h** - Đỏ Rose), `shift_night` (**Trực Đêm** - Tím Indigo), `shift_day` (**Trực Ngày** - Cam Amber), `off_morning` (**Ra trực Sáng** - Xanh Teal), `off_afternoon` (**Ra trực Chiều** - Xanh Emerald), kèm ghi chú khoa/phòng/bệnh viện.
  - Có thanh **"Chế độ Chấm Lịch Trực Nhanh (1-Click)"** trên Lịch Tháng kèm tùy chọn tự động điền *"Ra trực Sáng"* vào ngày kế tiếp khi chấm *Trực 24h* hoặc *Trực Đêm*.
  - Tô màu nền/viền nổi bật và gắn huy hiệu Y tế (`🩺`) cho các ngày trực trên **Lịch Tháng**, **Kế hoạch Tuần** và **Banner đầu trang Hôm nay** (kèm nhắc sớm nếu ngày mai có ca trực) + thống kê tổng số buổi trực trong tháng.
- **Phi mục tiêu:** Không làm hệ thống chia lịch tự động cho cả khoa nhiều bác sĩ.
- **Điều cần tránh:** Tránh bắt người dùng phải gõ tay từng ca trực như công việc thường; tránh mất dữ liệu lịch trực khi đồng bộ Cloud hoặc sao lưu JSON.

## 3. Ràng buộc (Constraints)
- Tương thích ngược 100% với dữ liệu `localStorage`, file sao lưu `.json` và đồng bộ đám mây Supabase hiện có (tự động khởi tạo `dutyShifts: []` nếu dữ liệu cũ chưa có trường này).

## 4. Phương án đã chọn (Approaches)
- **Phương án 1 (Đã chọn):** Xây dựng thực thể `DutyShift` chuyên biệt + Chế độ chấm trực 1-click trên Lịch Tháng + Hiển thị nổi bật theo mã màu riêng cho 5 loại ca trực.
- **Phương án 2 (Đã loại):** Dùng `Task` thông thường gắn nhãn trực viện (bị lẫn với việc hàng ngày và thao tác nhập lịch ngẫu nhiên chậm).

## 5. Thiết kế Kỹ thuật đã thống nhất (Decided How)
- Thêm kiểu `DutyShiftType = 'shift_24h' | 'shift_night' | 'shift_day' | 'off_morning' | 'off_afternoon'` và interface `DutyShift { id, date, type, note }` vào `PlannerState.dutyShifts`.
- Bổ sung các hàm thao tác trong `PlannerContext`: `setDutyShift(date, type | null, note?, autoAddPostShift?)` và hiển thị trên `MonthlyCalendarView`, `WeeklyPlannerView`, `DailyFocusView`, `AnalyticsView`.

## 6. Phần do Builder tự chủ quyết định (Left to the Builder)
- Tông màu chi tiết cho chế độ Sáng/Tối của từng loại ca trực và dữ liệu mẫu ban đầu (thêm sẵn vài ca trực mẫu trong tháng để thấy ngay hiệu ứng nổi bật).
