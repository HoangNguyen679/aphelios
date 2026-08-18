import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { markdownToHtml } from './markdown'

const postsDirectory = path.join(process.cwd(), 'posts')

type PostMetadata = {
  date: string
  title: string
}

export function getPostFileNames(directory = postsDirectory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => entry.name)
}

export function getSortedPostsData() {
  const allPostsData = getPostFileNames().map(fileName => {
    const id = fileName.replace(/\.md$/, '')
    const fullPath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const matterResult = matter(fileContents)

    return {
      id,
      ...(matterResult.data as PostMetadata)
    }
  })

  return allPostsData.sort((a, b) => b.date.localeCompare(a.date))
}

export function getAllPostIds() {
  return getPostFileNames().map(fileName => ({
    params: {
      id: fileName.replace(/\.md$/, '')
    }
  }))
}

export async function getPostData(id: string) {
  const fullPath = path.join(postsDirectory, `${id}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const matterResult = matter(fileContents)
  const contentHtml = await markdownToHtml(matterResult.content)

  return {
    id,
    contentHtml,
    ...(matterResult.data as PostMetadata)
  }
}
