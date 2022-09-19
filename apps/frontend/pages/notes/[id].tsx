import React from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Interface } from '../../src/layout'
import { SingleNote } from '../../src/notes'

const Home: NextPage = () => {
  const router = useRouter()
  const { id } = router.query
  const noteId = String(id)

  return id ? (
    <>
      <Head>
        <title>Editor Project</title>
      </Head>

      <Interface activeNoteId={noteId}>
        {noteId ? <SingleNote id={noteId} key={noteId} /> : null}
      </Interface>
    </>
  ) : null
}

export default Home
