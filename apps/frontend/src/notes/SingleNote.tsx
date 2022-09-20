import { Badge, BadgeTypeMap, Paper, TextField } from '@mui/material'
import React, { useEffect, useRef, useState } from 'react'
import { ReadyState } from 'react-use-websocket'
import { Descendant, Operation } from 'slate'
import { ulid } from 'ulid'
import { NoteMessage } from '../../../backend/model/note-message.model'
import { Note } from '../../../backend/model/note.model'
import { Editor } from '../editor'
import { useNote } from './hooks'

interface SingleNoteProps {
  id: string
}

const Home: React.FC<SingleNoteProps> = ({ id }) => {
  const editorId = useRef(ulid())
  const { message, readyState, sendMessage } = useNote(id, editorId.current)
  const [note, setNote] = useState<Note>()
  const [operations, setOperations] = useState<Operation[]>([])
  const [title, setTitle] = useState('')

  const connectionStatusColor = {
    [ReadyState.CONNECTING]: 'info',
    [ReadyState.OPEN]: 'success',
    [ReadyState.CLOSING]: 'warning',
    [ReadyState.CLOSED]: 'error',
    [ReadyState.UNINSTANTIATED]: 'error',
  }[readyState] as BadgeTypeMap['props']['color']

  useEffect(() => {
    if (note?.title) {
      setTitle(note?.title)
    }

  }, [note?.title])

  useEffect(() => {
    if (!message) {
      return
    }

    switch(message.type) {
      case 'note':
        setNote(message.message as Note)
        break
      case 'operations':
        setOperations(message.message as Operation[])
        break
      case 'title':
        setTitle(message.message as string)
        break
      default:
        console.log(`Unknown websocket message type: ${message.type}`)
    }
  }, [message])

  const updateContent = (value: Descendant[]) => {
    const noteMessage: NoteMessage = {
      type: 'update-content',
      message: value
    }

    sendMessage(JSON.stringify(noteMessage))
  }

  const updateTitle = () => {
    // only update the title in backend on blur as in google docs
    const noteMessage: NoteMessage = {
      type: 'update-title',
      message: title
    }

    sendMessage(JSON.stringify(noteMessage))
  }

  const sendOperations = (value: Operation[]) => {
    const noteMessage: NoteMessage = {
      type: 'operations',
      message: value
    }

    sendMessage(JSON.stringify(noteMessage))
  }

  const sendTitle = (value: string) => {
    const noteMessage: NoteMessage = {
      type: 'title',
      message: value
    }

    sendMessage(JSON.stringify(noteMessage))
  }

  const onTitleChange = (value: string) => {
    setTitle(value)
    sendTitle(value)
  }

  return note ? (
    <>
      <Badge color={connectionStatusColor} variant="dot" sx={{ width: '100%' }}>
        <TextField
          value={title}
          variant="standard"
          fullWidth={true}
          inputProps={{ style: { fontSize: 32, color: '#666' } }}
          sx={{ mb: 2 }}
          onChange={e => onTitleChange(e.target.value)}
          onBlur={updateTitle}
        />
      </Badge>
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Editor
          initialValue={note.content}
          operations={operations}
          updateContent={updateContent}
          sendOperations={sendOperations}
        />
      </Paper>
    </>
  ) : null
}

export default Home
