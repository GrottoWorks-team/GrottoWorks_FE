import { expect, test } from 'vitest'
import {
  MISSING,
  formatDate,
  formatDateTime,
  formatDuration,
  formatPercent,
  formatQuantity,
  formatVnd,
} from './format'

test('formatVnd: số hợp lệ có đơn vị, thiếu dữ liệu ra dấu gạch', () => {
  expect(formatVnd(1234567)).toBe('1.234.567 ₫')
  expect(formatVnd(0)).toBe('0 ₫')
  expect(formatVnd(null)).toBe(MISSING)
  expect(formatVnd(undefined)).toBe(MISSING)
  expect(formatVnd(Number.NaN)).toBe(MISSING)
})

test('formatQuantity: giữ đơn vị, không hiện số âm, thiếu dữ liệu ra dấu gạch', () => {
  expect(formatQuantity(12, 'bao')).toBe('12 bao')
  expect(formatQuantity(2.5, 'm3')).toBe('2,5 m3')
  expect(formatQuantity(-4, 'bao')).toBe('0 bao')
  expect(formatQuantity(undefined, 'bao')).toBe(MISSING)
})

test('formatPercent và formatDuration chịu dữ liệu thiếu', () => {
  expect(formatPercent(42)).toBe('42%')
  expect(formatPercent(null)).toBe(MISSING)
  expect(formatDuration(45)).toBe('45p')
  expect(formatDuration(90)).toBe('1g 30p')
  expect(formatDuration(120)).toBe('2g')
  expect(formatDuration(undefined)).toBe(MISSING)
})

test('formatDate/formatDateTime nhận ISO và trả dấu gạch khi thiếu', () => {
  expect(formatDate('2026-12-24')).toBe('24/12/2026')
  expect(formatDate('2026-12-24T18:00:00Z')).toBe('24/12/2026')
  expect(formatDate('')).toBe(MISSING)
  expect(formatDate('khong-phai-ngay')).toBe(MISSING)
  expect(formatDateTime('')).toBe(MISSING)
  expect(formatDateTime('2026-12-24T18:00:00')).toMatch(/^18:00 24\/12\/2026$/)
})
