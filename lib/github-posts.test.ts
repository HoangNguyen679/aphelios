import { describe, expect, it } from 'vitest'
import { validSlug } from './github-posts'

describe('validSlug', () => {
  it('accepts safe post slugs', () => {
    expect(validSlug('my-post_2')).toBe(true)
    expect(validSlug('rails')).toBe(true)
  })

  it('rejects paths and unsupported characters', () => {
    expect(validSlug('../secret')).toBe(false)
    expect(validSlug('My Post')).toBe(false)
    expect(validSlug('-post')).toBe(false)
  })
})
