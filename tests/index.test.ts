import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Home from '../pages/index'

describe('Home', () => {
  it('renders the visible post title as the link', () => {
    const html = renderToStaticMarkup(createElement(Home, {
      allPostsData: [{
        date: '2024-11-18',
        id: 'example',
        title: 'Example post'
      }]
    }))

    expect(html).toContain('<a href="/posts/example">Example post</a>')
    expect(html).not.toMatch(/<a[^>]*>\s*<a/)
  })
})
