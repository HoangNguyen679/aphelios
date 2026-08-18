import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { getPostFileNames } from './posts'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true })
  }
})

describe('getPostFileNames', () => {
  it('returns only Markdown files', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aphelios-posts-'))
    temporaryDirectories.push(directory)

    fs.writeFileSync(path.join(directory, 'post.md'), '# Post')
    fs.writeFileSync(path.join(directory, '.DS_Store'), 'metadata')
    fs.writeFileSync(path.join(directory, 'notes.txt'), 'notes')
    fs.mkdirSync(path.join(directory, 'nested.md'))

    expect(getPostFileNames(directory)).toEqual(['post.md'])
  })
})
