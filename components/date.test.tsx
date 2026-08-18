import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Date } from './date'

describe('Date', () => {
  it('formats an ISO date without shifting time zones', () => {
    const html = renderToStaticMarkup(createElement(Date, { dateString: '2024-11-18' }))

    expect(html).toBe('<time dateTime="2024-11-18">November 18, 2024</time>')
  })
})
