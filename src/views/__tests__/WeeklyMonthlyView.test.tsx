import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PlannerProvider } from '../../context/PlannerContext';
import { WeeklyPlannerView } from '../WeeklyPlannerView';
import { MonthlyCalendarView } from '../MonthlyCalendarView';
import { DailyFocusView } from '../DailyFocusView';

describe('Weekly and Monthly Views', () => {
  it('renders 7 days of the week plus Backlog column and Weekly Focus notes without shift selector dropdowns', () => {
    render(
      <PlannerProvider>
        <WeeklyPlannerView />
      </PlannerProvider>
    );
    expect(screen.getByRole('heading', { name: /Kế hoạch Tuần/i })).toBeTruthy();
    expect(screen.getByText(/Trọng tâm Tuần/i)).toBeTruthy();
    expect(screen.queryAllByLabelText(/Chọn ca trực ngày/i)).toHaveLength(0);
  });

  it('refreshes weekly focus notes when navigating to another week after saving', () => {
    render(
      <PlannerProvider>
        <WeeklyPlannerView />
      </PlannerProvider>
    );
    const focusInput = screen.getByPlaceholderText(
      /Mỗi dòng 1 mục tiêu trọng tâm trong tuần này/i
    ) as HTMLTextAreaElement;
    fireEvent.change(focusInput, { target: { value: 'Mục tiêu riêng tuần 1' } });
    fireEvent.click(screen.getByText(/Lưu kế hoạch tuần/i));

    // Chuyển sang tuần sau
    fireEvent.click(screen.getByTitle('Tuần sau'));
    expect(focusInput.value).not.toBe('Mục tiêu riêng tuần 1');
  });

  it('renders Monthly Calendar grid and Trọng tâm của Tháng panel with compact shift icon next to day number and priority-colored task pills', () => {
    render(
      <PlannerProvider>
        <MonthlyCalendarView />
      </PlannerProvider>
    );
    expect(screen.getByText(/Trọng tâm của Tháng/i)).toBeTruthy();
    expect(screen.getByText(/Chấm Lịch Trực Bác Sĩ Nhanh/i)).toBeTruthy();
    expect(screen.getByLabelText(/Biểu tượng ca trực: Trực 24h/i)).toBeTruthy();
    const monthlyPills = screen.getAllByTestId('monthly-task-pill');
    expect(monthlyPills.length).toBeGreaterThan(0);
    expect(monthlyPills[0].className).toMatch(/bg-(rose|amber|indigo|slate)-/);
  });

  it('hides priority badge and edit/delete icons by default in WeeklyPlannerView and reveals them on double-click', () => {
    render(
      <PlannerProvider>
        <WeeklyPlannerView />
      </PlannerProvider>
    );
    // Mặc định ẩn thanh footer (TB + icon sửa, xóa) để tiết kiệm không gian
    expect(screen.queryAllByTestId('weekly-task-footer')).toHaveLength(0);

    // Click đúp vào thẻ công việc đầu tiên trong tuần để hiện thanh footer
    const taskCards = screen.getAllByTestId('weekly-task-card');
    expect(taskCards.length).toBeGreaterThan(0);
    // Không dùng border-l-4 mà tô màu nền toàn bộ ô việc theo mức độ ưu tiên
    expect(taskCards[0].className).not.toContain('border-l-4');
    expect(taskCards[0].className).toMatch(/bg-(rose|amber|indigo|slate)-/);
    fireEvent.doubleClick(taskCards[0]);

    expect(screen.getAllByTestId('weekly-task-footer')).toHaveLength(1);

    const editButton = screen.getByTitle(/Sửa công việc/i);
    const deleteButton = screen.getByTitle(/Xóa công việc/i);
    expect(editButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();

    // Bấm nút Sửa công việc và lưu tên mới
    fireEvent.click(editButton);
    const editInput = screen.getByPlaceholderText('Tên công việc') as HTMLInputElement;
    fireEvent.change(editInput, { target: { value: 'Việc đã chỉnh sửa tên' } });
    fireEvent.click(screen.getByText(/Lưu sửa/i));
    expect(screen.getByText('Việc đã chỉnh sửa tên')).toBeTruthy();
  });

  it('opens a floating Day Task Popover only on double-click in WeeklyPlannerView and MonthlyCalendarView with synchronized priority icons and start/end time synced to Lịch trình theo khung giờ', () => {
    render(
      <PlannerProvider>
        <WeeklyPlannerView />
        <MonthlyCalendarView />
        <DailyFocusView />
      </PlannerProvider>
    );
    expect(screen.queryByTestId('day-task-popover')).toBeNull();

    const dayColumns = screen.getAllByTestId('weekly-day-column');
    expect(dayColumns.length).toBe(7);

    // Click đơn (1 lần) trên Tuần và Tháng chỉ chọn ngày, CHƯA mở cửa sổ nổi
    fireEvent.click(dayColumns[0]);
    expect(screen.queryByTestId('day-task-popover')).toBeNull();

    const monthCells = screen.getAllByTestId('monthly-day-cell');
    fireEvent.click(monthCells[0]);
    expect(screen.queryByTestId('day-task-popover')).toBeNull();

    // Click đúp (2 lần) vào cột ngày mới mở cửa sổ nổi Popover
    const currentDayColumns = screen.getAllByTestId('weekly-day-column');
    fireEvent.doubleClick(currentDayColumns[0]);
    const popover = screen.getByTestId('day-task-popover');
    expect(popover).toBeTruthy();

    // Đồng bộ icon mức độ ưu tiên: Khẩn cấp, Ưu tiên cao, Trung bình, Thấp
    const urgentBtn = screen.getByRole('button', { name: /Khẩn cấp/i });
    expect(screen.getByRole('button', { name: /Ưu tiên cao/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Trung bình/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Thấp/i })).toBeTruthy();
    fireEvent.click(urgentBtn);

    // Nhập tên công việc + Giờ bắt đầu & Giờ kết thúc (đồng bộ Lịch trình theo khung giờ)
    const composerInput = screen.getByPlaceholderText(
      /Nhập tên công việc cho ngày đang chọn/i
    ) as HTMLInputElement;
    fireEvent.change(composerInput, {
      target: { value: 'Hội chẩn ca bệnh nặng' },
    });

    const popoverStartInput = within(popover).getByLabelText('Giờ bắt đầu') as HTMLInputElement;
    const popoverEndInput = within(popover).getByLabelText('Giờ kết thúc') as HTMLInputElement;
    fireEvent.change(popoverStartInput, { target: { value: '08:00' } });
    fireEvent.change(popoverEndInput, { target: { value: '09:30' } });

    fireEvent.click(screen.getByRole('button', { name: /Thêm vào ngày/i }));

    expect(screen.getAllByText('Hội chẩn ca bệnh nặng').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/08:00\s*-\s*09:30/).length).toBeGreaterThan(0);

    // Kiểm tra đồng bộ trực tiếp sang "Lịch trình theo khung giờ" (timeline-task-block):
    // Cùng 1 việc kéo dài qua nhiều khung giờ (08:00 - 09:30) chỉ hiển thị thành 1 khối duy nhất
    const timelineBlocks = screen
      .getAllByTestId('timeline-task-block')
      .filter((el) => el.textContent?.includes('Hội chẩn ca bệnh nặng'));
    expect(timelineBlocks).toHaveLength(1);
    expect(timelineBlocks[0].textContent).toContain('08:00 - 09:30');
    expect(timelineBlocks[0].textContent).toContain('Khẩn cấp');

    // Đóng Popover
    fireEvent.click(screen.getByTitle('Đóng bảng quản lý ngày'));
    expect(screen.queryByTestId('day-task-popover')).toBeNull();
  });

  it('supports 1-Tap opening of DayTaskPopoverModal and task actions for iPhone touch screens, and spawns next recurring task on completion', () => {
    render(
      <PlannerProvider>
        <WeeklyPlannerView />
        <MonthlyCalendarView />
      </PlannerProvider>
    );

    // 1-Tap vào nút + trên cột ngày tuần mở ngay Popover
    const openDayBtns = screen.getAllByTestId('weekly-open-day-btn');
    expect(openDayBtns.length).toBe(7);
    fireEvent.click(openDayBtns[0]);
    const popover = screen.getByTestId('day-task-popover');
    expect(popover).toBeTruthy();

    // Tạo công việc lặp lại Hàng ngày trong Popover rồi đánh dấu hoàn thành để tự sinh việc ngày kế tiếp
    const titleInput = within(popover).getByPlaceholderText(
      /Nhập tên công việc cho ngày đang chọn/i
    );
    const recurrenceSelect = within(popover).getByLabelText('Lặp lại công việc');
    fireEvent.change(titleInput, { target: { value: 'Giao ban khoa buổi sáng' } });
    fireEvent.change(recurrenceSelect, { target: { value: 'daily' } });
    fireEvent.click(within(popover).getByRole('button', { name: /Thêm vào ngày/i }));

    // Tích hoàn thành công việc lặp lại vừa tạo trong Popover
    const taskBtn = within(popover).getByText('Giao ban khoa buổi sáng');
    fireEvent.click(taskBtn);

    // Chuyển sang ngày kế tiếp ngay trên Popover -> công việc lặp lại đã tự động được sinh ra!
    fireEvent.click(within(popover).getByTitle('Ngày kế tiếp'));
    expect(within(popover).getByText('Giao ban khoa buổi sáng')).toBeTruthy();

    // Đóng Popover và thử nút 1-Tap mở tùy chọn thẻ việc (•••)
    fireEvent.click(within(popover).getByTitle('Đóng bảng quản lý ngày'));
    const toggleActionBtns = screen.getAllByTestId('weekly-task-toggle-actions');
    expect(toggleActionBtns.length).toBeGreaterThan(0);
    fireEvent.click(toggleActionBtns[0]);
    expect(screen.getAllByTestId('weekly-task-footer')).toHaveLength(1);
  });
});
