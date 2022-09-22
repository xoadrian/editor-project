import { firestore } from 'firebase-admin'
import { Descendant } from 'slate'
import { ulid } from 'ulid'

import { Note } from '../model/note.model'
import db from '../firebase'
import { NotesService } from './notes.service'

jest.mock('../firebase', () => ({
  collection: jest.fn()
}))
jest.mock('ulid')

describe('NotesService', () => {
  let service: NotesService
  let ref: firestore.CollectionReference<Note>
  let docOne: firestore.DocumentSnapshot
  let docTwo: firestore.DocumentSnapshot
  let noteOne: Note
  let noteTwo: Note
  let refDoc: jest.Mock
  let refDocSet: jest.Mock
  let refDocUpdate: jest.Mock

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
    docOne = {
      id: noteOne.id,
      data: jest.fn(() => ({
        title: noteOne.title,
        content: noteOne.content
      }))
    } as unknown as firestore.DocumentSnapshot
    docTwo = {
      id: noteTwo.id,
      data: jest.fn(() => ({
        title: noteTwo.title,
        content: noteTwo.content
      }))
    } as unknown as firestore.DocumentSnapshot
    refDocSet = jest.fn()
    refDocUpdate = jest.fn()
    refDoc = jest.fn(() => ({
      get: jest.fn(() => docOne),
      set: refDocSet,
      update: refDocUpdate
    }))
    ref = {
      id: 'notes',
      get: jest.fn(() => ({
        docs: [docOne, docTwo]
      })),
      doc: refDoc
    } as unknown as firestore.CollectionReference<Note>
    jest.mocked(db.collection).mockReturnValue(ref)

    service = new NotesService()
  })

  it('should get ref on new instance', () => {
    service = new NotesService()
    expect(db.collection).toHaveBeenCalledWith('notes')
  })

  it('should get the reference', () => {
    expect(service.getRef()).toBe(ref)
  })

  it('should fetch the notes', async () => {
    const response = await service.getNotes()

    expect(response).toEqual([noteOne, noteTwo])
    expect(ref.get).toHaveBeenCalled()
  })

  it('should get the note', async () => {
    const response = await service.getNote(noteOne.id)

    expect(response).toEqual(noteOne)
    expect(refDoc).toHaveBeenCalledWith(noteOne.id)
  })

  it('should create a note', async () => {
    const newNote: Note = {
      id: 'randomId',
      title: 'New Note',
      content: [{
        type: 'paragraph',
        children: [{ text: 'Some nice content here!' }],
      }] as unknown as Descendant[]
    }
    const {id, ...restOfTheNote} = newNote
    jest.mocked(ulid).mockReturnValue(id)

    const response = await service.createNote()

    expect(response).toEqual(newNote)
    expect(refDoc).toHaveBeenCalledWith(id)
    expect(refDocSet).toHaveBeenCalledWith(restOfTheNote)
  })

  it('should update the content of the note', async () => {
    const content: Descendant[] = [{
      text: 'some text'
    }]

    await service.updateContent(noteOne.id, content)

    expect(refDoc).toHaveBeenCalledWith(noteOne.id)
    expect(refDocUpdate).toHaveBeenCalledWith({
      content
    })
  })

  it('should update the title of the note', async () => {
    const title = 'New Title'

    await service.updateTitle(noteOne.id, title)

    expect(refDoc).toHaveBeenCalledWith(noteOne.id)
    expect(refDocUpdate).toHaveBeenCalledWith({
      title
    })
  })
})
