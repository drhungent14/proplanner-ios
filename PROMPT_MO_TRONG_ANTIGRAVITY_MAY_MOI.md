# 🚀 BẢN BÀN GIAO & KỊCH BẢN TỰ ĐỘNG CÀI ĐẶT 1-CHẠM CHO ANTIGRAVITY (MÁY TÍNH MỚI)

> **DÀNH CHO USER (BÁC SĨ HÙNG):**
> Khi mở thư mục project này bằng **Antigravity** trên máy tính mới, bạn chỉ cần nhắn đúng 1 câu sau vào khung chat của Antigravity:
>
> ```text
> Đọc file PROMPT_MO_TRONG_ANTIGRAVITY_MAY_MOI.md và tự động cài đặt toàn bộ môi trường (Node.js, thư viện, Supabase, chạy app) cho tao ngay lập tức, không cần hỏi lại.
> ```

---

## 🤖 LỆNH BẮT BUỘC DÀNH CHO AGENT ANTIGRAVITY TRÊN MÁY TÍNH MỚI (AI INSTRUCTIONS)

Xin chào **Antigravity trên máy tính mới**! Bạn đang tiếp nhận dự án **ProPlanner (Hybrid Executive Planner + iOS `.ipa` + Supabase Realtime Cloud Sync)** của **Bác sĩ Hùng**.
Nhiệm vụ của bạn là **TỰ ĐỘNG THỰC THI 100% CÁC BƯỚC DƯỚI ĐÂY BẰNG `run_command`** mà không bắt người dùng gõ tay bất kỳ lệnh nào. Luôn giao tiếp bằng **Tiếng Việt**.

---

### BƯỚC 1: KIỂM TRA & TỰ ĐỘNG CÀI ĐẶT NODE.JS + GIT (NẾU MÁY MỚI CHƯA CÓ)

1. Chạy lệnh kiểm tra `node -v` và `npm.cmd -v`.
2. **Nếu máy chưa có Node.js**:
   - Chạy lệnh cài tự động qua Winget:
     ```powershell
     winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent
     ```
   - Nếu `winget` không khả dụng, hãy dùng PowerShell tải bản Node.js LTS Windows `.zip` chính thức từ `https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip`, giải nén vào `$env:USERPROFILE\.tools\nodejs` và thêm vào `PATH` của User.
   - Sau khi cài, nạp lại biến môi trường `PATH` trong phiên PowerShell:
     ```powershell
     $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";C:\Program Files\nodejs"
     ```
3. Kiểm tra `git --version`. Nếu chưa có Git, tự động chạy:
   ```powershell
   winget install Git.Git --accept-source-agreements --accept-package-agreements --silent
   ```

---

### BƯỚC 2: DỌN DẸP LOCKFILE CŨ & CÀI ĐẶT TOÀN BỘ THƯ VIỆN (`node_modules`)

1. Nếu trong thư mục có `pnpm-lock.yaml` hoặc `node_modules` cũ bị lỗi đường dẫn từ máy khác, hãy xóa `pnpm-lock.yaml`.
2. Chạy lệnh cài đặt toàn bộ thư viện của dự án:
   ```powershell
   npm.cmd install --legacy-peer-deps
   ```
3. Đảm bảo các gói cốt lõi đã sẵn sàng:
   - `react`, `react-dom`, `lucide-react`, `date-fns`
   - `@supabase/supabase-js` (Đồng bộ đám mây thời gian thực)
   - `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/local-notifications` (Đóng gói iOS `.ipa` & Thông báo màn hình khóa)
   - `vite`, `typescript`, `vitest`, `@testing-library/react`

---

### BƯỚC 3: KIỂM TRA CẤU HÌNH ĐÁM MÂY SUPABASE (`.env`)

Đảm bảo file `.env` tại thư mục gốc của project có đầy đủ thông tin kết nối tới đám mây Supabase của Bác sĩ Hùng (nếu chưa có thì tạo ngay file `.env` với nội dung sau):

```env
VITE_SUPABASE_URL=https://dtyscysyqpnnatordxhn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eXNjeXN5cXBubmF0b3JkeGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMTE5ODAsImV4cCI6MjEwOTg4Nzk4MH0.AJlKgcW5S1c553Rjnqn3tFiYvCvOa30r8HFvyHpyiHE
VITE_SUPABASE_PROFILE_KEY=personal-main
```

> **Lưu ý:** Thông tin này cũng đã được tích hợp mặc định trong `src/lib/seedData.ts` và `src/lib/storageSync.ts`, giúp app tự động kết nối và kéo toàn bộ dữ liệu (`personal-main`) về máy mới ngay khi mở!

---

### BƯỚC 4: KIỂM TRA UNIT TESTS & BUILD SẢN PHẨM

1. Chạy kiểm tra 24 Unit Tests để đảm bảo mã nguồn hoạt động hoàn hảo 100%:
   ```powershell
   .\node_modules\.bin\vitest.cmd run
   ```
2. Chạy kiểm tra đóng gói Production:
   ```powershell
   npm.cmd run build
   ```

---

### BƯỚC 5: KHỞI ĐỘNG SERVER & TẠO SHORTCUT 1-CHẠM NGOÀI MÀN HÌNH DESKTOP

1. Khởi chạy Vite Dev Server ở chế độ chạy nền (daemon) tại cổng `5173`:
   ```powershell
   .\node_modules\.bin\vite.cmd --host --port 5173
   ```
2. Tạo một Shortcut tên là **`ProPlanner - Bác Sĩ Hùng.lnk`** ngay ngoài màn hình **Desktop** của máy tính mới, trỏ tới file `Chay_Web_App.bat` trong thư mục project để lần sau người dùng chỉ cần nhấp đúp ngoài màn hình chính là mở được app.
3. Tự động mở trình duyệt tại địa chỉ `http://localhost:5173`.

---

## 📚 TỔNG QUAN KIẾN TRÚC DỰ ÁN (CONTEXT CHO ANTIGRAVITY MỚI)

Để tiếp tục phát triển hoặc chỉnh sửa tính năng khi người dùng yêu cầu, đây là toàn bộ kiến trúc dự án đã hoàn thiện:

1. **Giao diện Kép (Adaptive Dual UI — Bản Web Máy tính & Bản Di động iPhone 12 Pro Max)**:
   - **`src/components/MobileCompanionApp.tsx` (Phiên bản Di động chuyên biệt cho iPhone 12 Pro Max — `428 × 926 px`)**:
     - Tự động kích hoạt khi mở trên iPhone / màn hình dọc hoặc khi bấm nút **`📱 App iPhone 12 Pro Max`** trên thanh Header của máy tính.
     - Thiết kế chuẩn **Apple HIG (One-Handed Thumb Zone)** với **4 Tab Cốt lõi + Nút `+` Trung tâm (Ghi nhanh 1-Chạm bằng Bottom Sheet)**:
       1. **Hôm nay**: Thanh lướt nhanh 7 ngày (`T2 → CN`), Thẻ Hero đổi nhanh Ca trực 1-chạm + Thanh tiến độ ngày + Nút gom việc tồn quá hạn 1-chạm; Segmented Control chuyển mượt giữa **🎯 Việc cần làm (Top 3 Tiêu điểm + Việc trong ngày)**, **⏰ Lịch giờ dọc tinh gọn**, và **💪 Thói quen 1-chạm**.
       2. **Lịch trực**: Thống kê số ca trực trong tháng, lưới lịch tháng gọn hiển thị nhãn `24h`, `Đêm`, `Ngày`, `RaS`, `RaC` và bảng gán nhanh ca trực ở vùng ngón cái.
       3. **Nút `+` Giữa**: Mở Bottom Sheet **Ghi nhanh 1-Chạm** (chọn nhanh `Hôm nay` / `Ngày mai` / `Hộp nháp`, chọn nhanh khung giờ `07:00..21:00`, gắn sao Top 3, lưu trong 2 giây).
       4. **Nháp & Đích**: Đẩy việc từ Hộp thư nháp sang Hôm nay/Ngày mai bằng 1 chạm & theo dõi tiến độ Mục tiêu.
       5. **Đồng bộ**: Đồng bộ 2 chiều tức thì với Máy tính qua Supabase (`personal-main`) và chế độ **OLED Dark Mode** tiết kiệm pin cho màn hình Super Retina XDR của iPhone 12 Pro Max.
   - **Giao diện Web Máy tính đầy đủ (`src/views/`)**:
     - `src/views/DailyFocusView.tsx`: Trang **Hôm nay (Daily Focus)** tích hợp:
     - Top 3 Trọng tâm trong ngày + Khung điền Ca trực / Phẫu thuật / Hội chẩn.
     - **Lịch Khung Giờ (Time-Blocking 05:00 – 22:00)** có:
       - Đồng hồ thời gian thực + **Vạch đỏ giờ hiện tại (`timeline-now-indicator`)** tự trôi theo từng phút.
       - **Kéo thả trực tiếp công việc (`Drag & Drop`)** trên vạch giờ (bước nhảy 15 phút).
       - **Kéo giãn cạnh dưới (`timeline-resize-handle`)** để tăng/giảm thời lượng công việc theo từng nấc 15 phút.
       - **Click vào giờ trống** để mở form tạo nhanh công việc (`quick-slot-form`) hoặc kéo việc từ cột bên trái thả vào khung giờ.
     - Nhật ký Y khoa / Ghi chú ca lâm sàng, Theo dõi 8 cốc nước, Thói quen trong ngày.
   - `src/views/WeekMonthView.tsx`: Lịch Tuần (7 ngày) & Lịch Tháng + Quản lý Ca trực (`dutyShifts`: Sáng, Chiều, Đêm, 24h).
   - `src/views/VisionGoalsView.tsx`: Mục tiêu Quý/Năm, Cột mốc (`milestones`) & Ma trận Bánh xe Cuộc đời (8 khía cạnh).
   - `src/views/HabitTrackerView.tsx`: Bảng theo dõi chuỗi Thói quen (`streak`) & Tổng kết tuần.
   - `src/views/AnalyticsView.tsx`: Biểu đồ hiệu suất & phân bổ thời gian.
   - `src/views/SettingsSyncView.tsx`: Cài đặt giao diện, Nhắc việc, Xuất/Nhập JSON, Mã kết nối nhanh (`encodeQuickSyncToken`), và Đồng bộ Đám mây Supabase Realtime.

2. **Trạng thái & Đồng bộ Đám mây (`src/context/PlannerContext.tsx` & `src/lib/storageSync.ts`)**:
   - Lưu trữ Offline-first tại `localStorage` (`hybrid_executive_planner_v1`) kết hợp tự động đẩy/kéo (`pushStateToSupabase`, `pullStateFromSupabase`, `subscribeToRealtimeChanges`) lên bảng `public.planner_states` tại Supabase (`https://dtyscysyqpnnatordxhn.supabase.co`, khóa hồ sơ `personal-main`).

3. **Thông báo iOS & Đóng gói `.ipa` (`src/lib/notificationService.ts` & `.github/workflows/build-ios-ipa.yml`)**:
   - Tự động lên lịch thông báo màn hình khóa iOS qua `@capacitor/local-notifications` (và Web Notification API trên trình duyệt) cho Top 3 ưu tiên, công việc có giờ bắt đầu, và nhắc uống nước.
   - Kho lưu trữ GitHub đóng gói `.ipa` tự động trên máy chủ macOS Xcode: `https://github.com/drhungent14/proplanner-ios`.
   - File cài đặt iPhone đã đóng gói sẵn: `ProPlanner.ipa` ngay tại thư mục gốc của project.
