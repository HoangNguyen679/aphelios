import rehypePrism from 'rehype-prism-plus'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'

export const markdownToHtml = async (markdown: string) => {
  const result = await remark()
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeSlug)
    .use(rehypePrism)
    .use(rehypeStringify)
    .process(markdown)

  return result.toString()
}
