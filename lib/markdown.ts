import remark from 'remark';
import html from 'remark-html';
import prism from 'remark-prism';

export const markdownToHtml = async(markdown: string) => {
  const result = await remark().use(html).use(prism).process(markdown);
  return result.toString();
}