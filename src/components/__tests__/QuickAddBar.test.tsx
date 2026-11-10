import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlannerProvider } from '../../context/PlannerContext';
import { QuickAddBar } from '../QuickAddBar';

describe('QuickAddBar', () => {
  it('submits a new task when typing a title and submitting the form', () => {
    render(
      <PlannerProvider>
        <QuickAddBar defaultDate="2026-11-09" />
      </PlannerProvider>
    );
    const input = screen.getByPlaceholderText(/Thêm nhanh công việc/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hoàn thành báo cáo quý' } });
    fireEvent.submit(input.closest('form')!);
    expect(input.value).toBe('');
  });
});
