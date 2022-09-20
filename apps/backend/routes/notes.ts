import express, { RequestHandler, Response } from 'express'
import { WebsocketRequestHandler } from 'express-ws'
import { Descendant, Operation } from 'slate'
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

export interface OperationsResponse extends Record<string, Operation[]> {}

const notesService = new NotesService()

const notesHandler: RequestHandler = async (_req, res: Response<NotesResponse>) => {
  // // Use to populate DB
  // await notesService.createNote(NOTE_1)
  // await notesService.createNote(NOTE_2)

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
        case 'operations':
          const operations: NoteMessage = {
            type,
            message
          }
          sendMessageToOtherClients(JSON.stringify(operations))
          break
        case 'title':
          const title: NoteMessage = {
            type,
            message
          }
          sendMessageToOtherClients(JSON.stringify(title))
          break
        case 'update-content':
          await notesService.updateContent(req.params.id, message as Descendant[])
          break
        case 'update-title':
          const fetchNotes: NoteMessage = {
            type: 'fetch-notes'
          }
          await notesService.updateTitle(req.params.id, message as string)
          sendMessageToAllRootWebSockets(wss, JSON.stringify(fetchNotes))
          break
        default:
          console.log(`Unknown websocket message type: ${type}`)
      }
    }
  })
}

// const operationsHandler: WebsocketRequestHandler = (ws, req) => {
//   // console.log('operationsHandler::: ', req.params.id, typeof req.params.id)
//   // if (req.params.id == null || req.params.id === 'undefined') {
//   //   return
//   // }
//
//   const handlerCreateTime = Date.now()
//
//   const firebaseUnsubscribe = operationsService.getRef().doc(req.params.id).onSnapshot(snapshot => {
//     const snapshotUpdateTime = (snapshot.updateTime?.seconds ?? 0) * 1000
//
//     if (snapshotUpdateTime < handlerCreateTime) {
//       // prevent taking operations prior to handle creation
//       console.log('FB snapshot::: prevent taking operations prior to handle creation::: ', snapshotUpdateTime, handlerCreateTime, snapshotUpdateTime < handlerCreateTime)
//       return
//     }
//     console.log('FB snapshot::: ', req.params.id, snapshot.data())
//     const operations = operationsService.getChangesForEditor(snapshot, req.params.editorId)
//
//     if (operations.length) {
//       ws.send(JSON.stringify(operations))
//     }
//     // snapshot.docChanges().forEach(change => {
//     //   const isChangeTypeAllowed = /*change.type === 'added' || */change.type === 'modified'
//     //   console.log('FB operation change::: ', {isChangeTypeAllowed, id: change.doc.id, noteId})
//     //   if (isChangeTypeAllowed && change.doc.id === noteId) {
//     //     const operationsResponse = operationsService.convertDocumentToOperations(change.doc)
//     //     ws.send(JSON.stringify(operationsResponse))
//     //   }
//     // })
//   })
//
//   ws.on('close', () => {
//     firebaseUnsubscribe()
//   })
//
//   ws.on('message', async (message: string) => {
//     await operationsService.save(req.params.id, req.params.editorId, JSON.parse(message))
//   })
// }

router.get('/', notesHandler)
router.ws('/', notesWsHandler)
router.ws('/:id/:editorId', noteWsHandler)

export default router
