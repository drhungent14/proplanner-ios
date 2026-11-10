---
name: cai-dat-may-moi
description: Tự động kiểm tra và cài đặt Node.js, Git, các gói thư viện npm, kết nối đám mây Supabase (personal-main), tạo Desktop Shortcut và khởi chạy ứng dụng ProPlanner trên máy tính mới chỉ với 1 lệnh. Kích hoạt ngay khi người dùng yêu cầu cài đặt, chạy lại project, thiết lập môi trường trên máy mới, hoặc nhắc tới PROMPT_MO_TRONG_ANTIGRAVITY_MAY_MOI.md.
---

# Kỹ năng Tự động Cài đặt & Khởi chạy ProPlanner trên Máy tính mới (1-Chạm)

Khi người dùng mở dự án này trên máy tính mới và yêu cầu cài đặt / chạy dự án, hãy thực hiện tuần tự và tự động 100% các bước sau bằng công cụ `run_command`:

1. **Kiểm tra & Cài đặt Node.js LTS**:
   - Kiểm tra `node -v`. Nếu chưa có, chạy:
     `winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent`
   - Cập nhật biến môi trường `PATH` trong phiên chạy để gọi được `node` và `npm.cmd` ngay lập tức.

2. **Cài đặt Thư viện Dự án (`node_modules`)**:
   - Xóa `pnpm-lock.yaml` (nếu có) để tránh xung đột đường dẫn từ máy cũ.
   - Chạy `npm.cmd install --legacy-peer-deps`.

3. **Kiểm tra Kết nối Đám mây Supabase (`.env`)**:
   - Đảm bảo file `.env` có chứa:
     - `VITE_SUPABASE_URL=https://dtyscysyqpnnatordxhn.supabase.co`
     - `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eXNjeXN5cXBubmF0b3JkeGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMTE5ODAsImV4cCI6MjEwOTg4Nzk4MH0.AJlKgcW5S1c553Rjnqn3tFiYvCvOa30r8HFvyHpyiHE`
     - `VITE_SUPABASE_PROFILE_KEY=personal-main`

4. **Kiểm tra Build & Test**:
   - Chạy `.\node_modules\.bin\vitest.cmd run` và `npm.cmd run build`.

5. **Khởi chạy Server & Tạo Shortcut Desktop**:
   - Chạy `.\node_modules\.bin\vite.cmd --host --port 5173` dưới dạng tiến trình nền (`IsDaemon: true`).
   - Tạo Shortcut ngoài màn hình Desktop trỏ tới `Chay_Web_App.bat` và mở trình duyệt tại `http://localhost:5173`.
