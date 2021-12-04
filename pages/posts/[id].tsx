import { Layout } from '../../components/layout'
import { getAllPostIds, getPostData } from '../../lib/posts'
import Head from 'next/head'
import { Date } from '../../components/date'
import utilStyles from '../../styles/utils.module.css'
import { GetStaticProps, GetStaticPaths } from 'next'

type PostProps = {
  postData: {
    title: string
    date: string
    contentHtml: string
  }
}

export default function Post({ postData }: PostProps) {
  return (
    <Layout>
      <Head>
        <title>{postData.title}</title>
      </Head>
      <article>
        <h1 className={`${utilStyles.headingXl} ${utilStyles.centerText}`}>{postData.title}</h1>
        <div className={`${utilStyles.lightText} ${utilStyles.centerText}`}>
          <Date dateString={postData.date} />
        </div>
        <div className={`${utilStyles.justifyText}`} dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
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