import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlannerProvider } from '../../context/PlannerContext';
import { DailyFocusView } from '../DailyFocusView';

describe('DailyFocusView', () => {
  it('renders Top 3 Tiêu Điểm section, Time-blocking timeline, and Thói quen hàng ngày, and immediately displays newly added timed tasks as a visible unified block', () => {
    render(
      <PlannerProvider>
        <DailyFocusView />
      </PlannerProvider>
    );
    expect(screen.getByText(/Tiêu điểm hôm nay \(Top 3\)/i)).toBeTruthy();
    expect(screen.getByText(/Lịch trình theo khung giờ/i)).toBeTruthy();
    expect(screen.getByText(/Thói quen hàng ngày/i)).toBeTruthy();

    // Thêm việc mới có giờ bắt đầu 11:00 và giờ kết thúc 15:00
    const titleInput = screen.getByPlaceholderText(/Thêm nhanh công việc mới/i);
    const startInput = screen.getByLabelText('Giờ bắt đầu');
    const endInput = screen.getByLabelText('Giờ kết thúc');

    fireEvent.change(titleInput, { target: { value: 'cccc' } });
    fireEvent.change(startInput, { target: { value: '11:00' } });
    fireEvent.change(endInput, { target: { value: '15:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Thêm việc/i }));

    const blocks = screen
      .getAllByTestId('timeline-task-block')
      .filter((el) => el.textContent?.includes('cccc'));
    expect(blocks).toHaveLength(1);

    const block = blocks[0] as HTMLElement;
    expect(block.textContent).toContain('11:00 - 15:00');
    expect(block.style.height).toBe('346px');

    // Đảm bảo lớp overlay cha có tọa độ left/right tường minh (không bị width=0 do class Tailwind v4)
    const overlayParent = block.parentElement as HTMLElement;
    expect(overlayParent.style.left).toBe('60px');
    expect(overlayParent.style.right).toBe('0px');

    // Kiểm tra thanh kéo giãn thời lượng (Resize Handle) và đồng hồ Hiện tại (HH:mm)
    expect(screen.getByTestId('timeline-now-badge').textContent).toMatch(/Hiện tại \d{2}:\d{2}/);
    expect(screen.getAllByTestId('timeline-resize-handle').length).toBeGreaterThan(0);

    // Kiểm tra bấm vào mốc giờ trên Lịch trình để mở khung thêm việc nhanh tại giờ đó
    const hourSlots = screen.getAllByTestId('timeline-hour-slot');
    fireEvent.click(hourSlots[0]);
    expect(screen.getByTestId('quick-slot-form')).toBeTruthy();
  });
});
