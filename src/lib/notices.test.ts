import { describe, expect, it } from 'vitest'
import { canPostNotice, isNoticeActive, isValidNoticeMessage, NOTICE_MAX_LENGTH } from './notices'

const slot = new Date(2026, 8, 26, 10, 0) // 10:00–11:00
const at = (h: number, m = 0) => new Date(2026, 8, 26, h, m)

describe('canPostNotice', () => {
  it('opens 1 hour before the slot', () => {
    expect(canPostNotice(slot, at(8, 59))).toBe(false)
    expect(canPostNotice(slot, at(9, 0))).toBe(true)
  })

  it('closes when the slot ends', () => {
    expect(canPostNotice(slot, at(11, 0))).toBe(true)
    expect(canPostNotice(slot, at(11, 1))).toBe(false)
  })
})

describe('isNoticeActive', () => {
  it('stays on the board until 2 hours after the slot ends', () => {
    expect(isNoticeActive(slot, at(12, 59))).toBe(true)
    expect(isNoticeActive(slot, at(13, 0))).toBe(false)
  })
})

describe('isValidNoticeMessage', () => {
  it('accepts 1 to 100 characters after trimming', () => {
    expect(isValidNoticeMessage('ok')).toBe(true)
    expect(isValidNoticeMessage('x'.repeat(NOTICE_MAX_LENGTH))).toBe(true)
    expect(isValidNoticeMessage('   ')).toBe(false)
    expect(isValidNoticeMessage('x'.repeat(NOTICE_MAX_LENGTH + 1))).toBe(false)
    expect(isValidNoticeMessage(`  ${'x'.repeat(NOTICE_MAX_LENGTH)}  `)).toBe(true)
  })
})
