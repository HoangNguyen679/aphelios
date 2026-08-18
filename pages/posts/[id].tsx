import { Layout } from '../../components/layout'
import { getAllPostIds, getPostData } from '../../lib/posts'
import Head from 'next/head'
import { Date } from '../../components/date'
import utilStyles from '../../styles/utils.module.css'
import { GetStaticProps, GetStaticPaths } from 'next'
import { useRef } from 'react'
import { ReadingNavigator } from '../../components/reading-navigator'

type PostProps = {
  postData: {
    title: string
    date: string
    contentHtml: string
  }
}

export default function Post({ postData }: PostProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <Layout>
      <Head>
        <title>{postData.title}</title>
      </Head>
      <ReadingNavigator contentRef={contentRef} contentId="post-content" />
      <article>
        <h1 className={`${utilStyles.headingXl} ${utilStyles.centerText}`}>{postData.title}</h1>
        <div className={`${utilStyles.lightText} ${utilStyles.centerText}`}>
          <Date dateString={postData.date} />
        </div>
        <div
          id="post-content"
          ref={contentRef}
          className={`${utilStyles.justifyText}`}
          dangerouslySetInnerHTML={{ __html: postData.contentHtml }}
        />
      </article>
    </Layout>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = getAllPostIds()
  return {
    paths,
    fallback: false
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const postData = await getPostData(params!.id as string)
  return {
    props: {
      postData
    }
  }
}