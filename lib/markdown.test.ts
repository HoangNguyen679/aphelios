import { describe, expect, it } from 'vitest'
import { markdownToHtml } from './markdown'

describe('markdownToHtml', () => {
  it('renders images, heading links, and highlighted code', async () => {
    const html = await markdownToHtml(`
[Jump](#example-heading)

## Example heading

![Diagram](/images/diagram.png)

\`\`\`js
const answer = 42
\`\`\`
`)

    expect(html).toContain('<a href="#example-heading">Jump</a>')
    expect(html).toContain('<h2 id="example-heading">Example heading</h2>')
    expect(html).toContain('<img src="/images/diagram.png" alt="Diagram">')
    expect(html).toContain('class="language-js"')
    expect(html).toContain('class="token keyword"')
  })

  it('removes raw HTML and unsafe URLs', async () => {
    const html = await markdownToHtml(`
<script>alert('unsafe')</script>

[Unsafe](javascript:alert('unsafe'))
`)

    expect(html).not.toContain('<script')
    expect(html).not.toContain('javascript:')
  })
})
