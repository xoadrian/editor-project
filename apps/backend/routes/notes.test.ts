import express, { Request, Response } from 'express'
import { Operation } from 'slate'
import * as ws from 'ws';
import { NoteMessage } from '../model/note-message.model'
import { NoteWebSocket } from '../model/note-web-socket.model'
import { Note } from '../model/note.model'
import { notesHandler, NotesResponse, notesWsHandler, noteWsHandler } from './notes'
import { NotesService } from '../services/notes.service'


jest.mock('express', () => ({
  Router: jest.fn(() => ({
    get: jest.fn(),
    ws: jest.fn()
  }))
}))
jest.mock('express-ws/lib/add-ws-method')
jest.mock('ws')
jest.mock('../services/notes.service')

describe('notes routes', () => {
  let noteOne: Note
  let noteTwo: Note
  let ws: ws
  let wss: ws.Server
  let req: Request
  let listener: (message: string) => void
  let rootWsOne: ws
  let rootWsTwo: ws
  let noteWsOne: NoteWebSocket
  let noteWsTwo: NoteWebSocket

  beforeEach(() => {
    noteOne = {
      id: 'n1',
      title: 'Note One',
      content: []
    }
    noteTwo = {
      id: 'n2',
      title: 'Note Two',
      content: []
    }
    ws = {
      on: jest.fn((event, cb) => {
        listener = cb
      }),
      send: jest.fn()
    } as unknown as ws
    rootWsOne = {
      send: jest.fn()
    } as unknown as ws
    rootWsTwo = {
      send: jest.fn()
    } as unknown as ws
    noteWsOne = {
      noteId: 'n1',
      editorId: 'editor1',
      send: jest.fn()
    } as unknown as NoteWebSocket
    noteWsTwo = {
      noteId: 'n1',
      editorId: 'editor2',
      send: jest.fn()
    } as unknown as NoteWebSocket
    wss = {
      clients: [rootWsOne, rootWsTwo, noteWsOne, noteWsTwo]
    } as unknown as ws.Server
    req = {
      app: {
        get: jest.fn(() => wss)
      },
      params: {
        id: noteWsOne.noteId,
        editorId: noteWsOne.editorId
      }
    } as unknown as Request
    jest.mocked(NotesService.prototype.getNotes).mockResolvedValue([noteOne, noteTwo])
  })

  describe('on module import', () => {
    it('should create proper routes', () => {
      expect(express.Router).toHaveBeenCalled()
    })
  })

  describe('notesHandler', () => {
    let res: Response<NotesResponse>

    it('should get the notes', async () => {
      res = {
        json: jest.fn()
      } as unknown as Response<NotesResponse>

      await notesHandler({} as Request, res, () => ({}))

      expect(res.json).toHaveBeenCalledWith({
        notes: [noteOne, noteTwo].map(note => ({
          id: note.id,
          title: note.title
        }))
      })
    })
  })

  describe('notesWsHandler', () => {
    beforeEach(() => {
      notesWsHandler(ws, req, () => ({}))
    })

    it('should do nothing is message type is not known',  async () => {
      expect(req.app.get).toHaveBeenCalledWith('wss')
      const noteMessage: NoteMessage = {
        type: 'update-content'
      }
      const noteMessageString = JSON.stringify(noteMessage)

      await listener(noteMessageString)

      expect(NotesService.prototype.createNote).not.toHaveBeenCalled()
      expect(ws.send).not.toHaveBeenCalled()
    })

    it('should create new note and notify all the root clients', async () => {
      const noteMessage: NoteMessage = {
        type: 'create-note'
      }
      const noteMessageString = JSON.stringify(noteMessage)
      jest.mocked(NotesService.prototype.createNote).mockResolvedValue(noteOne)
      const expectedNoteMessage: NoteMessage = {
        type: 'note',
        message: noteOne
      }
      const expectedFetchNotesMessage: NoteMessage = {
        type: 'fetch-notes'
      }
      const expectedFetchNotesMessageString = JSON.stringify(expectedFetchNotesMessage)

      await listener(noteMessageString)

      expect(NotesService.prototype.createNote).toHaveBeenCalled()
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(expectedNoteMessage))
      expect(rootWsOne.send).toHaveBeenCalledWith(expectedFetchNotesMessageString)
      expect(rootWsTwo.send).toHaveBeenCalledWith(expectedFetchNotesMessageString)
      expect(noteWsOne.send).not.toHaveBeenCalledWith(expectedFetchNotesMessageString)
      expect(noteWsTwo.send).not.toHaveBeenCalledWith(expectedFetchNotesMessageString)
    })
  })

  describe('noteWsHandler', () => {
    beforeEach(() => {
      noteWsHandler(ws, req, () => ({}))
    })

    it('should fetch the note when empty message', async () => {
      jest.mocked(NotesService.prototype.getNote).mockResolvedValue(noteOne)
      const noteMessage: NoteMessage = {
        type: 'note',
        message: noteOne
      }

      await listener('')

      expect(NotesService.prototype.getNote).toHaveBeenCalledWith(req.params.id)
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(noteMessage))
    })

    it('should do nothing if message type is not recognized', async () => {
      const noteMessage: NoteMessage = {
        type: 'create-note'
      }
      jest.spyOn(console, 'log')

      await listener(JSON.stringify(noteMessage))

      expect(console.log).toHaveBeenCalledWith(`Unknown websocket message type: ${noteMessage.type}`)
    })

    it.each([
      {
        type: 'operations',
        message: [{type: 'insert_node'} as Operation]
      },
      {
        type: 'title',
        message: 'Title Changed'
      }
    ])('should stream operations and title to other clients', async (noteMessage) => {
      const noteMessageString = JSON.stringify(noteMessage)

      await listener(noteMessageString)

      expect(noteWsTwo.send).toHaveBeenCalledWith(noteMessageString)
      expect(noteWsOne.send).not.toHaveBeenCalledWith(noteMessageString)
      expect(rootWsOne.send).not.toHaveBeenCalledWith(noteMessageString)
      expect(rootWsTwo.send).not.toHaveBeenCalledWith(noteMessageString)
    })

    it('should update the note content in DB', async () => {
      const noteMessage: NoteMessage = {
        type: 'update-content',
        message: [{
          text: 'Some text'
        }]
      }
      const noteMessageString = JSON.stringify(noteMessage)

      await listener(noteMessageString)

      expect(NotesService.prototype.updateContent).toHaveBeenCalledWith(req.params.id, noteMessage.message)
    })

    it('should update the note title in DB and notify the clients to re-fetch the notes', async () => {
      const noteMessage: NoteMessage = {
        type: 'update-title',
        message: 'Some Updated Title'
      }
      const noteMessageString = JSON.stringify(noteMessage)
      const fetchNotesMessage: NoteMessage = {
        type: 'fetch-notes'
      }
      const fetchNotesMessageString = JSON.stringify(fetchNotesMessage)

      await listener(noteMessageString)

      expect(NotesService.prototype.updateTitle).toHaveBeenCalledWith(req.params.id, noteMessage.message)
      expect(rootWsOne.send).toHaveBeenCalledWith(fetchNotesMessageString)
      expect(rootWsTwo.send).toHaveBeenCalledWith(fetchNotesMessageString)
      expect(noteWsOne.send).not.toHaveBeenCalledWith(fetchNotesMessageString)
      expect(noteWsTwo.send).not.toHaveBeenCalledWith(fetchNotesMessageString)
    })
  })
})
