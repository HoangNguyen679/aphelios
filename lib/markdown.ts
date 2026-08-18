import rehypePrism from 'rehype-prism-plus'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'

type HtmlNode = {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HtmlNode[]
}

const imageDimensions: Record<string, { width: number; height: number }> = {
  '/images/high-memory-graph.webp': { width: 1288, height: 407 },
  '/images/low-memory-graph.webp': { width: 1600, height: 286 },
  '/images/swarm-llm-func.webp': { width: 1600, height: 929 },
  '/images/swarm-flow-chart.webp': { width: 1600, height: 1688 }
}

function rehypeOptimizeImages() {
  return (tree: HtmlNode) => {
    function visit(node: HtmlNode) {
      if (node.tagName === 'img' && node.properties) {
        const source = String(node.properties.src || '')
        node.properties.loading = 'lazy'
        node.properties.decoding = 'async'

        const dimensions = imageDimensions[source]
        if (dimensions) {
          node.properties.width = dimensions.width
          node.properties.height = dimensions.height
        }
      }
      node.children?.forEach(visit)
    }

    visit(tree)
  }
}

export const markdownToHtml = async (markdown: string) => {
  const result = await remark()
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeOptimizeImages)
    .use(rehypeSlug)
    .use(rehypePrism)
    .use(rehypeStringify)
    .process(markdown)

  return result.toString()
}
