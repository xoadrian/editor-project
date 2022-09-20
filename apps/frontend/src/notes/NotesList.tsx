import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import Link from 'next/link'
import { Button, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material'
import { Assignment as AssignmentIcon } from '@mui/icons-material'
import { NoteMessage } from '../../../backend/model/note-message.model'
import { Note } from '../../../backend/model/note.model'
import { useNotesList, useNotesWs } from './hooks'

const drawerWidth = 240

interface NotesListProps {
  activeNoteId?: string
}

const NotesList: React.FC<NotesListProps> = ({ activeNoteId }) => {
  const router = useRouter()
  const { notesList, mutate } = useNotesList()
  const { message, sendMessage } = useNotesWs()

  useEffect(() => {
    if (!message) return

    switch (message.type) {
      case 'fetch-notes': {
        mutate()
        break
      }
      case 'note': {
        const newNote = message.message as Note
        router.push(`/notes/${newNote.id}`)
        break
      }
      default:
        console.log(`Unknown websocket message type: ${message.type}`)
    }

  }, [message])

  const addNote = async () => {
    const noteMessage: NoteMessage = {
      type: 'create-note'
    }

    sendMessage(JSON.stringify(noteMessage))
  }

  return (
    <Drawer variant="permanent" sx={{
      width: drawerWidth,
      flexShrink: 0,
      '& .MuiDrawer-paper': {
        width: drawerWidth,
        boxSizing: 'border-box',
      },
    }}>
      <Toolbar>
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          sx={{ flexGrow: 1 }}
        >
          Notes
        </Typography>
        <Button onClick={addNote}>Add</Button>
      </Toolbar>
      <Divider />
      <List>
        {notesList?.map((note) => (
          <Link href={`/notes/${note.id}`} key={note.id}>
            <ListItemButton selected={note.id === activeNoteId}>
              <ListItemIcon>
                <AssignmentIcon />
              </ListItemIcon>
              <ListItemText primary={note.title} />
            </ListItemButton>
          </Link>
        ))}
      </List>
      <Divider />
    </Drawer>
  )
}

export default NotesList
