import express, { RequestHandler, Response } from 'express'
import { WebsocketRequestHandler } from 'express-ws'
// import expressWs from 'express-ws'
import * as ws from 'ws';
import { Descendant, Operation } from 'slate'
import { NOTE_1, NOTE_2 } from '../fixtures/notes'
import { Note } from '../model/note.model'
import { NotesService } from '../services/notes.service'
import { OperationsService } from '../services/operations.service'

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

export interface NoteResponse {
  id: string
  title: string
  content: Array<Descendant>
}

export interface OperationsResponse extends Record<string, Operation[]> {}

const operationsService = new OperationsService()
const notesService = new NotesService()

const notesHandler: RequestHandler = async (_req, res: Response<NotesResponse>) => {
  // Use to populate DB
  // await notesService.updateNote(NOTE_1)
  // await notesService.updateNote(NOTE_2)

  const notes = await notesService.getNotes()
  // console.log('notesHandler::: ', notes)

  res.json({
    notes: notes.map(note => ({
      id: note.id,
      title: note.title
    }))
  })
}

const noteHandler: WebsocketRequestHandler = (ws, req) => {
  // // @ts-ignore
  // const wss = req.app.get('wss') as ws.Server
  // wss.on('connection', (asd) => {
  //   console.log('WS Clients::: ', wss.clients.size)
  //   // console.log('NEW Connection::: ', {asd, ws, same: asd === ws})
  //   asd.on('message', async (message: string) => {
  //     for (const client of wss.clients) {
  //       console.log({
  //         readyState: client.readyState,
  //         open: client.OPEN
  //       })
  //       if(client !== ws && client.readyState === client.OPEN) {
  //         console.log('send message::: ', {
  //           id: req.params.id,
  //           message
  //         })
  //       }
  //
  //       if (client === ws) {
  //         console.log('WS::: ', {
  //           id: req.params.id,
  //           message
  //         })
  //
  //         if (req.params.id == null || req.params.id === 'undefined') {
  //           return
  //         }
  //
  //         let note: Note | undefined
  //         noteId = req.params.id
  //
  //         if (!message) {
  //           note = await notesService.getNote(req.params.id)
  //           console.log('WS::: GET NOTE::: ', note)
  //         } else {
  //           // note = await notesService.updateNote(JSON.parse(message))
  //           // will take the response from firebase snapshot instead of sending WS message back
  //           // await notesService.updateNote(JSON.parse(message))
  //         }
  //
  //         if (note != null) {
  //           return ws.send(JSON.stringify(note))
  //         }
  //       }
  //     }
  //   })
  //   // @ts-ignore
  //   // wss.clients.forEach(client => {
  //   //   console.log({client}, client === ws)
  //   // })
  // })

  // console.log('APPP::: ', req.app.get('wss'))
  // // @ts-ignore
  // const wss = req.socket.server
  // // @ts-ignore
  // wss.on('connection', (asd) => {
  //   console.log('NEW Connection::: ', {asd, ws})
  //   ws.on('message', async (message: string) => {
  //     console.log('Clients::: ', message)
  //   })
  //   // @ts-ignore
  //   // wss.clients.forEach(client => {
  //   //   console.log({client}, client === ws)
  //   // })
  // })
  // // console.log('clients:::: ', req.socket.server)

  // one websocket per note id
  let noteId: string | undefined

  // // instead of using firebase snapshot changes, I think it will be better to use WS connections and emit all changes to
  // // all connected clients
  // notesService.getRef().onSnapshot(snapshot => {
  //   snapshot.docChanges().forEach(change => {
  //     if (change.type === 'modified' && change.doc.id === noteId) {
  //       const note = notesService.convertDocumentToNote(change.doc)
  //       console.log('SNAPSHOT modified::: ', note)
  //       ws.send(JSON.stringify(note))
  //     }
  //   })
  // })

  // operationsService.getRef().onSnapshot(snapshot => {
  //   snapshot.docChanges().forEach(change => {
  //     console.log('FB operation change::: ', change)
  //     const isChangeTypeAllowed = /*change.type === 'added' || */change.type === 'modified'
  //     if (isChangeTypeAllowed && change.doc.id === noteId) {
  //       const operations = operationsService.convertDocumentToOperations(change.doc)
  //       const noteResponse: NoteResponse = {
  //         operations,
  //         note: undefined
  //       }
  //       ws.send(JSON.stringify(noteResponse))
  //     }
  //   })
  // })

  ws.on('message', async (message: string) => {
    // console.log('WS::: ', {
    //   id: req.params.id,
    //   message
    // })

    if (req.params.id == null || req.params.id === 'undefined') {
      return
    }

    let note: Note | undefined
    noteId = req.params.id

    if (!message) {
      note = await notesService.getNote(req.params.id)
      // console.log('WS::: GET NOTE::: ', note)
    } else {
      await notesService.updateNote(JSON.parse(message))
    }

    if (note != null) {
      return ws.send(JSON.stringify(note))
    }
    // switch (req.params.id) {
    //   case NOTE_1.id: {
    //     return ws.send(JSON.stringify(NOTE_1))
    //   }
    //   case NOTE_2.id: {
    //     return ws.send(JSON.stringify(NOTE_2))
    //   }
    // }
  })
}

const operationsHandler: WebsocketRequestHandler = (ws, req) => {
  // console.log('operationsHandler::: ', req.params.id, typeof req.params.id)
  // if (req.params.id == null || req.params.id === 'undefined') {
  //   return
  // }

  const handlerCreateTime = Date.now()

  const firebaseUnsubscribe = operationsService.getRef().doc(req.params.id).onSnapshot(snapshot => {
    const snapshotUpdateTime = (snapshot.updateTime?.seconds ?? 0) * 1000

    if (snapshotUpdateTime < handlerCreateTime) {
      // prevent taking operations prior to handle creation
      console.log('FB snapshot::: prevent taking operations prior to handle creation::: ', snapshotUpdateTime, handlerCreateTime, snapshotUpdateTime < handlerCreateTime)
      return
    }
    console.log('FB snapshot::: ', req.params.id, snapshot.data())
    const operations = operationsService.getChangesForEditor(snapshot, req.params.editorId)

    if (operations.length) {
      ws.send(JSON.stringify(operations))
    }
    // snapshot.docChanges().forEach(change => {
    //   const isChangeTypeAllowed = /*change.type === 'added' || */change.type === 'modified'
    //   console.log('FB operation change::: ', {isChangeTypeAllowed, id: change.doc.id, noteId})
    //   if (isChangeTypeAllowed && change.doc.id === noteId) {
    //     const operationsResponse = operationsService.convertDocumentToOperations(change.doc)
    //     ws.send(JSON.stringify(operationsResponse))
    //   }
    // })
  })

  ws.on('close', () => {
    firebaseUnsubscribe()
  })

  ws.on('message', async (message: string) => {
    await operationsService.save(req.params.id, req.params.editorId, JSON.parse(message))
  })
}

router.get('/', notesHandler)
router.ws('/:id', noteHandler)
router.ws('/:id/operations/:editorId', operationsHandler)

export default router
