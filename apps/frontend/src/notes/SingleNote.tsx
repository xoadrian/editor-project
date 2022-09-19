import React from 'react'
import { Descendant } from 'slate'
import { Editor } from '../editor'
import { useNote } from './hooks'
import { ReadyState } from 'react-use-websocket'

import { Paper, TextField, Badge, BadgeTypeMap } from '@mui/material'

interface SingleNoteProps {
  id: string
}

const Home: React.FC<SingleNoteProps> = ({ id }) => {
  const { note, readyState, sendMessage } = useNote(id)

  console.log('HOME::: ', note)

  const connectionStatusColor = {
    [ReadyState.CONNECTING]: 'info',
    [ReadyState.OPEN]: 'success',
    [ReadyState.CLOSING]: 'warning',
    [ReadyState.CLOSED]: 'error',
    [ReadyState.UNINSTANTIATED]: 'error',
  }[readyState] as BadgeTypeMap['props']['color']

  const updateContent = (value: Descendant[]) => {
    sendMessage(JSON.stringify({
      ...note,
      content: value
    }))
  }

  return note ? (
    <>
      <Badge color={connectionStatusColor} variant="dot" sx={{ width: '100%' }}>
        <TextField
          value={note.title}
          variant="standard"
          fullWidth={true}
          inputProps={{ style: { fontSize: 32, color: '#666' } }}
          sx={{ mb: 2 }}
        />
      </Badge>
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {console.log('CONTENT::: ', note.content)}
        <Editor
          noteId={id}
          initialValue={note.content}
          updateContent={updateContent}
        />
      </Paper>
    </>
  ) : null
}

export default Home
