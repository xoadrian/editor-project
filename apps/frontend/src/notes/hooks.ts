/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useEffect } from 'react'
import useSWR from 'swr'
import { NoteMessage } from '../../../backend/model/note-message.model'
import { NotesResponse } from '../../../backend/routes/notes'
import useWebSocket, { ReadyState } from 'react-use-websocket'

// If you want to use GraphQL API or libs like Axios, you can create your own fetcher function. 
// Check here for more examples: https://swr.vercel.app/docs/data-fetching
const fetcher = async (
  input: RequestInfo,
  init: RequestInit
) => {
  const res = await fetch(input, init);
  return res.json();
}

export const useNotesList = () => {
  const { data, error, mutate } = useSWR<NotesResponse>('http://localhost:3001/api/notes', fetcher)

  return {
    notesList: data?.notes,
    isLoading: !error && !data,
    isError: error,
    mutate
  }
}

export const useNotesWs = () => {
  const { lastJsonMessage, sendMessage } = useWebSocket(`ws://localhost:3001/api/notes`)

  return {
    message: lastJsonMessage as NoteMessage,
    sendMessage
  }
}

export const useNote = (id: string, editorId: string) => {
  const { readyState, lastJsonMessage, sendMessage } = useWebSocket(`ws://localhost:3001/api/notes/${id}/${editorId}`)

  // Send a message when ready on first load
  useEffect(() => {
    if (readyState === ReadyState.OPEN && lastJsonMessage === null) {
      sendMessage('')
    }
  }, [readyState, lastJsonMessage])
  

  return {
    message: lastJsonMessage as NoteMessage,
    readyState,
    sendMessage
  }
}
