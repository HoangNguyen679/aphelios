import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FormEvent, useEffect, useState } from 'react'
import styles from '../styles/admin.module.css'

type PostDraft = {
  slug: string
  title: string
  date: string
  body: string
  sha?: string
}

type SessionResult = {
  authenticated: boolean
  configured: boolean
  login?: string
  error?: string
}

const DRAFT_KEY = 'aphelios-admin-draft'

function today() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function emptyPost(): PostDraft {
  return { slug: '', title: '', date: today(), body: '' }
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  })
  const result = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(result.error || 'The request failed.')
  return result
}

export default function Admin() {
  const router = useRouter()
  const [session, setSession] = useState<SessionResult | null>(null)
  const [posts, setPosts] = useState<string[]>([])
  const [post, setPost] = useState<PostDraft>(emptyPost)
  const [dirty, setDirty] = useState(false)
  const [draftAvailable, setDraftAvailable] = useState(false)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [commitUrl, setCommitUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    request<SessionResult>('/api/admin/session')
      .then(result => {
        setSession(result)
        if (result.authenticated) {
          request<{ posts: string[] }>('/api/admin/posts').then(data => setPosts(data.posts)).catch(err => setError(err.message))
          setDraftAvailable(Boolean(localStorage.getItem(DRAFT_KEY)))
        }
      })
      .catch(err => setSession({ authenticated: false, configured: false, error: err.message }))
  }, [])

  useEffect(() => {
    if (dirty) localStorage.setItem(DRAFT_KEY, JSON.stringify(post))
  }, [dirty, post])

  function update<K extends keyof PostDraft>(field: K, value: PostDraft[K]) {
    setPost(current => ({ ...current, [field]: value }))
    setDirty(true)
    setNotice('Draft saved in this browser')
  }

  function startNewPost() {
    if (dirty && !window.confirm('Leave the current unsaved changes? The browser draft will be kept.')) return
    setPost(emptyPost())
    setDirty(false)
    setPreview('')
    setCommitUrl('')
    setNotice('New post')
    setError('')
  }

  async function openPost(slug: string) {
    if (!slug) return startNewPost()
    if (dirty && !window.confirm('Discard the current unsaved changes?')) return

    setBusy(true)
    setError('')
    try {
      const result = await request<{ post: PostDraft }>(`/api/admin/posts?slug=${encodeURIComponent(slug)}`)
      setPost(result.post)
      setDirty(false)
      setPreview('')
      setCommitUrl('')
      setNotice(`Editing ${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the post.')
    } finally {
      setBusy(false)
    }
  }

  function restoreDraft() {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        setPost(JSON.parse(saved) as PostDraft)
        setDirty(true)
        setNotice('Browser draft restored')
      }
    } catch {
      setError('The browser draft could not be restored.')
    }
    setDraftAvailable(false)
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setDraftAvailable(false)
  }

  async function showPreview() {
    setBusy(true)
    setError('')
    try {
      const result = await request<{ html: string }>('/api/admin/preview', {
        method: 'POST',
        body: JSON.stringify({ body: post.body })
      })
      setPreview(result.html)
      setNotice('Preview updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not render the preview.')
    } finally {
      setBusy(false)
    }
  }

  async function publish(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('Publishing to GitHub…')
    try {
      const result = await request<{ sha: string; commitUrl: string }>('/api/admin/posts', {
        method: 'PUT',
        body: JSON.stringify(post)
      })
      setPost(current => ({ ...current, sha: result.sha }))
      setPosts(current => [...new Set([...current, post.slug])].sort())
      setDirty(false)
      setDraftAvailable(false)
      localStorage.removeItem(DRAFT_KEY)
      setCommitUrl(result.commitUrl)
      setNotice('Published. Vercel should update the blog in about a minute.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publishing failed.')
      setNotice('')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    await request('/api/admin/logout', { method: 'POST' })
    window.location.reload()
  }

  if (!session) {
    return <main className={styles.center}><p>Loading editor…</p></main>
  }

  if (!session.authenticated) {
    return (
      <main className={styles.center}>
        <Head><title>Blog editor</title><meta name="robots" content="noindex,nofollow" /></Head>
        <section className={styles.loginCard}>
          <h1>Blog editor</h1>
          <p>Sign in with the authorized GitHub account to write and publish posts.</p>
          {(error || router.query.error) && <p className={styles.error}>{error || String(router.query.error)}</p>}
          {session.error && <p className={styles.error}>{session.error}</p>}
          {session.configured && <Link className={styles.primaryButton} href="/api/admin/login">Sign in with GitHub</Link>}
          <Link href="/">← Return to the blog</Link>
        </section>
      </main>
    )
  }

  return (
    <div className={styles.page}>
      <Head><title>Blog editor</title><meta name="robots" content="noindex,nofollow" /></Head>
      <header className={styles.header}>
        <div><strong>Aphelios editor</strong><span>Signed in as {session.login}</span></div>
        <nav><Link href="/" target="_blank" rel="noreferrer">View blog ↗</Link><button type="button" onClick={logout}>Sign out</button></nav>
      </header>

      <main className={styles.workspace}>
        <aside className={styles.sidebar}>
          <button className={styles.primaryButton} type="button" onClick={startNewPost}>+ New post</button>
          <label htmlFor="post-list">Existing posts</label>
          <select id="post-list" value={post.sha ? post.slug : ''} onChange={event => openPost(event.target.value)} disabled={busy}>
            <option value="">Select a post…</option>
            {posts.map(slug => <option key={slug} value={slug}>{slug}</option>)}
          </select>
          {draftAvailable && (
            <div className={styles.draftPrompt}>
              <strong>Browser draft found</strong>
              <button type="button" onClick={restoreDraft}>Restore</button>
              <button type="button" onClick={discardDraft}>Discard</button>
            </div>
          )}
        </aside>

        <form className={styles.editor} onSubmit={publish}>
          <div className={styles.fields}>
            <label>Title<input value={post.title} onChange={event => update('title', event.target.value)} required /></label>
            <label>Date<input type="date" value={post.date} onChange={event => update('date', event.target.value)} required /></label>
            <label>Slug
              <span className={styles.slugField}>
                <input value={post.slug} onChange={event => update('slug', event.target.value)} disabled={Boolean(post.sha)} required pattern="[a-z0-9][a-z0-9_-]*[a-z0-9]|[a-z0-9]" />
                {!post.sha && <button type="button" onClick={() => update('slug', slugify(post.title))}>From title</button>}
              </span>
            </label>
          </div>

          <div className={styles.toolbar}>
            <span>
              {notice || (dirty ? 'Unsaved changes' : 'Ready')}
              {commitUrl && <> · <a href={commitUrl} target="_blank" rel="noreferrer">View commit ↗</a></>}
            </span>
            <button type="button" onClick={showPreview} disabled={busy}>Update preview</button>
            <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? 'Working…' : 'Publish'}</button>
          </div>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.panels}>
            <label className={styles.panel}>Markdown<textarea value={post.body} onChange={event => update('body', event.target.value)} placeholder="Write your post in Markdown…" /></label>
            <section className={`${styles.panel} ${styles.preview}`}>
              <strong>Preview</strong>
              {preview ? <article dangerouslySetInnerHTML={{ __html: preview }} /> : <p className={styles.placeholder}>Select “Update preview” to render the post.</p>}
            </section>
          </div>
        </form>
      </main>
    </div>
  )
}
