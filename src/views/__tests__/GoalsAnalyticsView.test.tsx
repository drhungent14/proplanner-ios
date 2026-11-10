import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../App';

describe('Goals, Analytics, and App shell', () => {
  it('renders the full application and navigates between Goals Timeline, Analytics, and Settings views', () => {
    render(<App />);
    expect(screen.getAllByText(/ProPlanner/i).length).toBeGreaterThan(0);

    // Navigate to Mục tiêu & Lộ trình
    const goalsNav = screen.getAllByText(/Mục tiêu/i)[0];
    fireEvent.click(goalsNav);
    expect(screen.getByText(/Biểu đồ Lộ trình Timeline/i)).toBeTruthy();

    // Navigate to Thống kê
    const analyticsNav = screen.getAllByText(/Thống kê/i)[0];
    fireEvent.click(analyticsNav);
    expect(screen.getByText(/Tỷ lệ hoàn thành/i)).toBeTruthy();

    // Kiểm tra nút ẩn / hiện cột điều hướng bên trái (Sidebar)
    expect(screen.getByTestId('desktop-sidebar')).toBeTruthy();
    const toggleBtn = screen.getByTestId('toggle-sidebar-btn');
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('desktop-sidebar')).toBeNull();
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('desktop-sidebar')).toBeTruthy();
  });
});
