import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PlannerProvider } from '../../context/PlannerContext';
import { MobileCompanionApp } from '../MobileCompanionApp';

describe('MobileCompanionApp (Giao diện chuyên biệt cho iPhone 12 Pro Max)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hiển thị thanh điều hướng 4 Tab chuẩn iOS cùng nút + Ghi nhanh 1-chạm ở giữa', () => {
    render(
      <PlannerProvider>
        <MobileCompanionApp />
      </PlannerProvider>
    );

    expect(screen.getByTestId('iphone-companion-app')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hôm nay' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lịch trực' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ghi nhanh công việc' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nháp & Đích/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đồng bộ' })).toBeInTheDocument();
  });

  it('mở Bottom Sheet Ghi nhanh 1-Chạm và thêm công việc mới vào danh sách ngay lập tức', () => {
    render(
      <PlannerProvider>
        <MobileCompanionApp />
      </PlannerProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Ghi nhanh công việc/i }));
    expect(screen.getByText(/Ghi nhanh 1-Chạm/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Nhập tên công việc, ca mổ, hội chẩn/i);
    fireEvent.change(input, { target: { value: 'Hội chẩn ca phẫu thuật nội soi' } });
    fireEvent.click(screen.getByRole('button', { name: '08:00' }));
    fireEvent.click(screen.getByRole('button', { name: /Lưu Công Việc Ngay/i }));

    expect(screen.getByText('Hội chẩn ca phẫu thuật nội soi')).toBeInTheDocument();
  });

  it('chuyển mượt giữa các chế độ Lịch giờ, Thói quen và Tab Lịch trực trên iPhone 12 Pro Max', () => {
    render(
      <PlannerProvider>
        <MobileCompanionApp />
      </PlannerProvider>
    );

    // Chuyển sang Lịch giờ
    fireEvent.click(screen.getByRole('button', { name: /⏰ Lịch giờ/i }));
    expect(screen.getByText(/Giờ hiện tại:/i)).toBeInTheDocument();

    // Chuyển sang Thói quen
    fireEvent.click(screen.getByRole('button', { name: /💪 Thói quen/i }));
    expect(screen.getByText(/Duy trì thói quen ngày/i)).toBeInTheDocument();

    // Chuyển sang Tab Lịch trực
    fireEvent.click(screen.getByRole('button', { name: /Lịch trực/i }));
    expect(screen.getByText(/Gán nhanh Ca trực/i)).toBeInTheDocument();
  });
});
