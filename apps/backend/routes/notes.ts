import express, { RequestHandler, Response } from 'express'
import { WebsocketRequestHandler } from 'express-ws'
import { Descendant } from 'slate'
import * as ws from 'ws';

import { getNoteWebSocket } from '../function/get-note-web-socket'
import { NoteMessage } from '../model/note-message.model'
import { NoteWebSocket } from '../model/note-web-socket.model'
import { NotesService } from '../services/notes.service'

// Patch `express.Router` to support `.ws()` without needing to pass around a `ws`-ified app.
// https://github.com/HenningM/express-ws/issues/86
// eslint-disable-next-line @typescript-eslint/no-var-requires
const patch = require('express-ws/lib/add-ws-method')
patch.default(express.Router)

const router = express.Router()

export interface NotesResponse {
  notes: Array<{
    id: string
    title: string
  }>
}

const notesService = new NotesService()

const notesHandler: RequestHandler = async (_req, res: Response<NotesResponse>) => {
  const notes = await notesService.getNotes()

  res.json({
    notes: notes.map(note => ({
      id: note.id,
      title: note.title
    }))
  })
}

const sendMessageToAllRootWebSockets = (wss: ws.Server, message: string) => {
  wss.clients.forEach(client => {
    const { noteId, editorId } = client as NoteWebSocket

    if (!noteId && !editorId) {
      // send message to all root clients
      client.send(message)
    }
  })
}

const notesWsHandler: WebsocketRequestHandler = (ws, req) => {
  const wss = req.app.get('wss') as ws.Server

  ws.on('message', async (wsMessage: string) => {
    const { type }: NoteMessage = JSON.parse(wsMessage)

    if (type === 'create-note') {
      const note = await notesService.createNote()
      const noteMessage: NoteMessage = {
        type: 'note',
        message: note
      }
      const fetchNotesMessage: NoteMessage = {
        type: 'fetch-notes'
      }
      ws.send(JSON.stringify(noteMessage))
      sendMessageToAllRootWebSockets(wss, JSON.stringify(fetchNotesMessage))
    }
  })
}

const noteWsHandler: WebsocketRequestHandler = (ws, req) => {
  const noteWebSocket = getNoteWebSocket(ws, req.params.id, req.params.editorId)
  const wss = req.app.get('wss') as ws.Server

  const sendMessageToOtherClients = (message: string) => {
    wss.clients.forEach(client => {
      const { noteId, editorId } = client as NoteWebSocket

      if (noteId == req.params.id && editorId !== req.params.editorId) {
        // send message to all clients except owner
        client.send(message)
      }
    })
  }

  noteWebSocket.on('message', async (wsMessage: string) => {
    if (!wsMessage) {
      const note = await notesService.getNote(req.params.id)
      const noteMessage: NoteMessage = {
        type: 'note',
        message: note
      }
      ws.send(JSON.stringify(noteMessage))
    } else {
      const { type, message }: NoteMessage = JSON.parse(wsMessage)

      switch (type) {
        case 'operations': {
          const operations: NoteMessage = {
            type,
            message
          }
          sendMessageToOtherClients(JSON.stringify(operations))
          break
        }
        case 'title': {
          const title: NoteMessage = {
            type,
            message
          }
          sendMessageToOtherClients(JSON.stringify(title))
          break
        }
        case 'update-content': {
          await notesService.updateContent(req.params.id, message as Descendant[])
          break
        }
        case 'update-title': {
          const fetchNotes: NoteMessage = {
            type: 'fetch-notes'
          }
          await notesService.updateTitle(req.params.id, message as string)
          sendMessageToAllRootWebSockets(wss, JSON.stringify(fetchNotes))
          break
        }
        default:
          console.log(`Unknown websocket message type: ${type}`)
      }
    }
  })
}

router.get('/', notesHandler)
router.ws('/', notesWsHandler)
router.ws('/:id/:editorId', noteWsHandler)

export default router
