# Tài Liệu Thiết Kế (Design Specification): Hệ Thống Lập Kế Hoạch & Quản Lý Mục Tiêu Chuyên Nghiệp (ProPlanner)

**Ngày tạo:** 2026-11-09  
**Nền tảng mục tiêu:** Web App trên Máy tính (Giai đoạn 1) & App cài trên iPhone `.ipa` / PWA (Giai đoạn 2)

---

## 1. Mục đích & Lý do xây dựng (Intent & Why)

Xây dựng một phần mềm lập kế hoạch cá nhân chuyên nghiệp (**ProPlanner**) kết nối liền mạch giữa **tư duy chiến lược dài hạn** và **hành động thực thi hàng ngày**:
- **Trên máy tính (Web App):** Tận dụng màn hình rộng, bàn phím và chuột để thiết lập mục tiêu lớn (Goals), nhìn trục thời gian (Timeline/Roadmap), kéo-thả phân bổ lịch tuần (Weekly Planner), lịch tháng (Monthly View) và phân tích biểu đồ thống kê (Analytics).
- **Trên iPhone (App cài vào máy):** Tận dụng tính cơ động để xem nhanh danh sách việc cần làm hôm nay, tích hoàn thành, ghi chú nhanh (Quick Inbox) và nhận thông báo nhắc việc (Notifications).
- **Đồng bộ xuyên suốt:** Mọi dữ liệu giữa Web App trên máy tính và App trên iPhone dùng chung một cơ sở dữ liệu đám mây (Supabase) và tự động đồng bộ theo thời gian thực.

---

## 2. Mục tiêu, Phi mục tiêu & Điều cần tránh (Goals, Non-Goals, Anti-Goals)

### Mục tiêu (Goals)
1. **Liên kết phân tầng 4 cấp độ:** Mục tiêu lớn (Goals & Milestones có Timeline) $\rightarrow$ Kế hoạch Tháng (Monthly Focus & Calendar) $\rightarrow$ Kế hoạch Tuần (7-day Kanban Drag & Drop) $\rightarrow$ Hành động Ngày (Top 3 ưu tiên, Lịch theo khung giờ, Việc cần làm, Thói quen).
2. **Cơ chế Lưu trữ & Đồng bộ Kép (Hybrid Local + Supabase Cloud Sync):**
   - Hoạt động ngay lập tức trên máy tính (lưu Local IndexedDB/LocalStorage) mà không bắt buộc phải cấu hình server trước khi dùng thử.
   - Tích hợp sẵn bộ đồng bộ **Supabase (PostgreSQL + Realtime + Auth)**: khi kết nối khoá Supabase (qua file `.env` hoặc nhập trực tiếp trên màn hình Cài đặt trong App), toàn bộ dữ liệu tự động đẩy lên đám mây và đồng bộ 2 chiều thời gian thực giữa Máy tính và iPhone.
3. **Hệ thống Thông báo & Nhắc việc (Notifications):**
   - Hỗ trợ hẹn giờ nhắc cho từng công việc, nhắc lập kế hoạch sáng và tổng kết tối.
   - Phát thông báo trình duyệt (Web Notification API) + chuông báo trong ứng dụng trên máy tính, đồng thời chuẩn bị sẵn chuẩn Web Push / Capacitor Local Notifications cho iPhone ở Giai đoạn 2.
4. **Thống kê chuyên sâu (Analytics Dashboard):**
   - Tỷ lệ hoàn thành theo ngày/tuần/tháng, biểu đồ phân bổ thời gian theo mảng cuộc sống (Công việc, Tài chính, Học tập, Sức khỏe, Cá nhân), chuỗi ngày duy trì thói quen (Streak) và tiến độ mục tiêu.
5. **Sẵn sàng cho iPhone ngay từ kiến trúc Giai đoạn 1:**
   - Giao diện thích ứng (Responsive): Hiển thị dạng Dashboard đa cột trên máy tính và tự động chuyển thành giao diện App di động (có thanh điều hướng đáy, hỗ trợ tai thỏ/Dynamic Island `safe-area-inset`) khi mở trên màn hình dọc hoặc đóng gói bằng Capacitor thành file `.ipa`.

### Phi mục tiêu trong Giai đoạn 1 (Non-Goals)
- Không làm tính năng phân quyền đội nhóm phức tạp hay chat nội bộ (đây là hệ thống phục vụ cá nhân).
- Không phụ thuộc vào các dịch vụ trả phí bắt buộc.

### Điều tuyệt đối tránh (Anti-Goals)
- **Tránh thao tác rườm rà:** Việc thêm nhanh một công việc mới không được quá 1 bước nhập liệu (phải có ô nhập nhanh + phím tắt).
- **Tránh khóa cứng ứng dụng khi mất mạng hoặc chưa nối Cloud:** Người dùng mở Web App lên là phải thao tác, tạo việc, xem biểu đồ được ngay lập tức, kể cả khi mất kết nối mạng.
- **Tránh tách rời giữa Mục tiêu và Việc hàng ngày:** Tránh việc tạo mục tiêu xong bị bỏ quên; mỗi công việc hàng ngày có thể gắn với một Mục tiêu/Cột mốc để tự động cộng dồn % tiến độ.

---

## 3. Ràng buộc kỹ thuật (Constraints)

- **Môi trường phát triển:** Máy tính Windows.
- **Ngôn ngữ hiển thị:** Tiếng Việt 100%, thuật ngữ rõ ràng, hiện đại, chuyên nghiệp.
- **Triển khai theo 2 giai đoạn:**
  - **Giai đoạn 1 (Hiện tại):** Xây dựng và hoàn thiện toàn bộ Web App chạy trên máy tính cùng hệ thống cơ sở dữ liệu đồng bộ.
  - **Giai đoạn 2 (Tiếp theo):** Đóng gói bộ mã nguồn Web App thành ứng dụng cài lên iPhone (qua Capacitor xuất `.ipa` trên Cloud / hoặc cài đặt PWA ra màn hình chính iOS) và kiểm thử đồng bộ thực tế trên iPhone.

---

## 4. Các phương án kỹ thuật đã cân nhắc (Approaches)

1. **Phương án 1 (Đã chọn): React (Vite) + TypeScript + Tailwind CSS + Supabase (Cloud Database & Realtime) + Capacitor / PWA**
   - *Lý do chọn:* Tối ưu hóa tốt nhất cho giao diện bảng biểu, kéo-thả và biểu đồ trên Web máy tính ở Giai đoạn 1; đồng thời tái sử dụng 100% mã nguồn để đóng gói thành App iPhone (`.ipa` qua Capacitor hoặc PWA) ở Giai đoạn 2 mà không phải viết lại code.
2. **Phương án 2: Web App thuần Offline trước, viết lại phần Cloud ở Giai đoạn 2**
   - *Lý do loại:* Tốn công viết lại tầng dữ liệu khi chuyển sang Giai đoạn 2. (Tuy nhiên, điểm mạnh "chạy ngay không cần cấu hình" của Phương án 2 đã được tích hợp luôn vào cơ chế Hybrid Sync của Phương án 1).
3. **Phương án 3: React Native (Expo) đa nền tảng**
   - *Lý do loại:* Trải nghiệm Web App trên màn hình lớn máy tính (kéo-thả lịch tuần, bảng timeline, phím tắt) kém linh hoạt hơn so với React Web chuẩn.

---

## 5. Thiết kế chi tiết Hệ thống & Chức năng (Architecture & Feature Design)

### 5.1. Kiến trúc Công nghệ (Tech Stack - Giai đoạn 1)
- **Frontend Framework:** React 18+ với TypeScript, đóng gói bằng Vite (tốc độ khởi chạy tức thì).
- **Giao diện & Styling:** Tailwind CSS + `lucide-react` (bộ icon sắc nét), hỗ trợ Chế độ Sáng / Tối (Dark/Light Mode).
- **Biểu đồ & Trực quan hóa:** Recharts (hoặc Chart.js / SVG tùy biến mượt mà) cho phần Thống kê và Timeline.
- **Lưu trữ & Đồng bộ (Hybrid Data Layer):**
  - `@supabase/supabase-js` kết nối với PostgreSQL trên Supabase.
  - Bộ đệm Local (`localStorage` / `IndexedDB`) kèm hàng đợi đồng bộ (Sync Queue): mọi thao tác (Thêm/Sửa/Xóa) cập nhật ngay lập tức trên giao diện (Optimistic UI), lưu xuống máy và đồng bộ ngầm lên Supabase.
  - Có sẵn file SQL Schema (`supabase/schema.sql`) và màn hình hướng dẫn/nhập nhanh `SUPABASE_URL` + `SUPABASE_ANON_KEY` ngay trong mục Cài đặt của ứng dụng.

### 5.2. Mô hình Dữ liệu cốt lõi (Data Model)

1. **Danh mục cuộc sống (`LifeArea` / `Category`):**
   - `id`, `name` (Công việc, Tài chính, Học tập, Sức khỏe, Cá nhân), `color`, `icon`.
2. **Mục tiêu dài hạn (`Goal`):**
   - `id`, `title`, `description`, `category_id`, `start_date`, `target_date`, `status` (`not_started`, `in_progress`, `completed`, `paused`), `progress_mode` (`auto_from_tasks` | `auto_from_milestones` | `manual`), `manual_progress` (0–100).
3. **Cột mốc mục tiêu (`Milestone`):**
   - `id`, `goal_id`, `title`, `start_date`, `due_date`, `is_completed`, `order_index`.
4. **Công việc (`Task`):**
   - `id`, `title`, `notes`, `category_id`, `goal_id` (tùy chọn), `milestone_id` (tùy chọn).
   - `status`: `todo` | `in_progress` | `done` | `cancelled`.
   - `priority`: `urgent` (Khẩn cấp) | `high` (Cao) | `medium` (Trung bình) | `low` (Thấp).
   - `scheduled_date` (Ngày thực hiện `YYYY-MM-DD`, hoặc `null` nếu đang ở Hộp thư nháp/Inbox).
   - `start_time` & `end_time` (Khung giờ Time-blocking trong ngày, ví dụ `09:00` - `10:30`, tùy chọn).
   - `estimated_minutes` (Thời lượng dự kiến) & `actual_minutes` (Thời lượng thực tế / Pomodoro).
   - `is_top_focus` (Đánh dấu thuộc Top 3 việc quan trọng nhất trong ngày).
   - `recurrence` (`none` | `daily` | `weekdays` | `weekly` | `monthly`).
   - `reminder_at` (Thời điểm phát thông báo nhắc nhở, ISO timestamp) & `reminder_sent` (boolean).
   - `subtasks`: Danh sách bước nhỏ (`id`, `title`, `is_completed`).
   - `updated_at` (Phục vụ đồng bộ đám mây).
5. **Thói quen hàng ngày (`Habit` & `HabitLog`):**
   - `Habit`: `id`, `title`, `category_id`, `goal_id` (tùy chọn), `frequency` (các ngày trong tuần), `target_per_day`, `streak_count`.
   - `HabitLog`: `id`, `habit_id`, `date` (`YYYY-MM-DD`), `completed` (boolean).
6. **Trọng tâm Tháng / Tuần (`PeriodPlan`):**
   - `id`, `period_type` (`month` | `week`), `period_key` (ví dụ `2026-11` hoặc `2026-W45`), `focus_goals` (danh sách mục tiêu trọng tâm), `reflection_notes` (ghi chú đánh giá cuối tuần/tháng).

### 5.3. Thiết kế 7 Phân khu Giao diện (Views) trên Web App

Thanh điều hướng bên trái (Sidebar trên máy tính, tự thu thành Bottom Bar trên điện thoại) gồm:

1. **Hôm nay / Tiêu điểm Ngày (Daily Focus View - Màn hình chính):**
   - **Thanh nhập việc siêu tốc (Quick Add Bar):** Nhập tên việc, chọn nhanh giờ hẹn, mức ưu tiên, gắn mục tiêu chỉ bằng 1 dòng.
   - **Khung Top 3 Tiêu điểm (Top 3 Priorities):** Tối đa 3 việc quan trọng nhất phải hoàn thành trong ngày để tránh dàn trải.
   - **Danh sách việc hôm nay & Việc quá hạn (Overdue):** Nhóm rõ ràng, tích hoàn thành có hiệu ứng mượt mà, mở xem chi tiết/subtasks bên cạnh.
   - **Lịch trình theo giờ (Time-blocking Timeline 06:00 – 23:00):** Nhìn trực quan các khung giờ trong ngày và đồng hồ bấm giờ tập trung (Focus Timer / Pomodoro) tích hợp sẵn.
   - **Bảng tích Thói quen hôm nay (Daily Habits):** Tích nhanh các thói quen trong ngày và xem chuỗi Streak.

2. **Kế hoạch Tuần (Weekly Planner View):**
   - Giao diện 7 cột tương ứng Thứ Hai đến Chủ Nhật + 1 cột **"Danh sách chờ (Backlog / Inbox)"**.
   - Kéo – thả (Drag & Drop) hoặc chuyển nhanh công việc giữa các ngày trong tuần để cân bằng khối lượng việc.
   - Khung *"Trọng tâm Tuần"* và *"Đánh giá cuối tuần (Weekly Review)"*.

3. **Kế hoạch Tháng (Monthly Calendar View):**
   - Lịch tháng lớn hiển thị các công việc, cột mốc (Milestones) của mục tiêu và mật độ công việc từng ngày.
   - Bấm vào ngày bất kỳ trên lịch để thêm việc hoặc xem chi tiết ngày đó.
   - Khung *"Trọng tâm của Tháng (Monthly Focus)"* ở cạnh lịch.

4. **Mục tiêu & Lộ trình (Goals & Timeline / Gantt View):**
   - Danh sách các Mục tiêu lớn kèm thanh % tiến độ tự động tính từ các Cột mốc và Công việc con đã hoàn thành.
   - **Biểu đồ Timeline / Gantt trực quan:** Hiển thị các mục tiêu và cột mốc chạy dọc theo trục thời gian (Tháng/Quý) để nắm rõ lộ trình dài hạn.

5. **Hộp thư nháp (Quick Inbox):**
   - Nơi lưu mọi ý tưởng, đầu việc phát sinh chưa kịp xếp ngày. Từ đây có thể phân loại nhanh vào Ngày, Tuần hoặc gắn vào Mục tiêu.

6. **Thống kê & Báo cáo (Analytics Dashboard):**
   - 4 thẻ chỉ số tổng quan (Tổng việc hoàn thành, Tỷ lệ đúng hạn %, Chuỗi Streak dài nhất, Tiến độ mục tiêu trung bình).
   - Biểu đồ xu hướng hoàn thành công việc 7 ngày / 30 ngày qua.
   - Biểu đồ phân bổ công sức theo Danh mục cuộc sống (Công việc, Tài chính, Học tập, Sức khỏe, Cá nhân).

7. **Thông báo & Đồng bộ Đám mây (Notifications & Cloud Sync Settings):**
   - Trung tâm thông báo (chuông báo trên thanh công cụ, bật/tắt thông báo trình duyệt + âm thanh nhắc việc).
   - Cấu hình **Đồng bộ Supabase & Xuất/Nhập dữ liệu dự phòng (JSON Backup)**: Cho phép kết nối tài khoản đám mây để đồng bộ với iPhone, xem trạng thái đồng bộ (`Đã đồng bộ` / `Đang chạy Offline`), và tải sẵn cấu hình PWA/Capacitor cho Giai đoạn 2.

---

## 6. Những quyết định kỹ thuật do Builder tự chủ xử lý (Left to the Builder)

Các chi tiết dưới đây sẽ được quyết định tối ưu trong quá trình lập kế hoạch và code mà không cần làm phiền người dùng:
- Hệ màu sắc chi tiết (sử dụng tông màu Indigo/Slate hiện đại, dịu mắt, hỗ trợ chuyển đổi Dark/Light mode).
- Dữ liệu mẫu ban đầu (Seed Data): Tự động khởi tạo một bộ dữ liệu mẫu thực tế (có thể xóa chỉ với 1 nút bấm) để ngay khi mở Web App lần đầu, người dùng thấy ngay cách vận hành của Mục tiêu, Timeline, Lịch tuần, Lịch ngày và Biểu đồ thống kê.
- Cấu hình sẵn `manifest.json`, meta tags chuẩn Apple iOS (`apple-mobile-web-app-capable`) và cấu hình nền Capacitor để Giai đoạn 2 chuyển sang iPhone diễn ra tức thì.
