import React from 'react';
import styles from './expenses.module.css';

interface ExpenseBarProps {
  width: number;
  label: string;
}

const widthClass = (width: number) => {
  if (width >= 95) return 'w-full';
  if (width >= 80) return 'w-4/5';
  if (width >= 65) return 'w-3/4';
  if (width >= 50) return 'w-2/3';
  if (width >= 35) return 'w-1/2';
  if (width >= 20) return 'w-1/3';
  return 'w-1/6';
};

export const ExpenseBar: React.FC<ExpenseBarProps> = ({ width, label }) => (
  <div
    className={`${styles.expenseBar} ${widthClass(width)}`}
    aria-label={`Expense bar for ${label}`}
    role="progressbar"
  />
);
