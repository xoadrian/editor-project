import React from 'react'
import { Box, Container } from '@mui/material'

import { NotesList } from '../notes'

interface InterfaceProps {
  activeNoteId?: string
}

const Interface: React.FC<InterfaceProps> = ({ activeNoteId, children }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <NotesList activeNoteId={activeNoteId} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          backgroundColor: '#eee',
          overflow: 'auto',
        }}
      >
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {children}
        </Container>
      </Box>
    </Box>
  )
}

export default Interface
