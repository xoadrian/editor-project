import { firestore } from 'firebase-admin'
import { Descendant } from 'slate'
import { ulid } from 'ulid'

import { Note } from '../model/note.model'
import db from '../firebase'

export class NotesService {
  private readonly ref = db.collection('notes')

  private generateNewNote(): Note {
    return {
      id: ulid(),
      title: 'New Note',
      content: [{
        type: 'paragraph',
        children: [{ text: 'Some nice content here!' }],
      }] as unknown as Descendant[]
    }
  }

  public convertDocumentToNote(doc: firestore.DocumentSnapshot): Note {
    return {
      ...doc.data() as Note,
      id: doc.id
    }
  }

  public getRef(): firestore.CollectionReference {
    return this.ref
  }

  public async getNotes(): Promise<Note[]> {
    const snapshot = await this.ref.get()

    return snapshot.docs.map(doc => this.convertDocumentToNote(doc)).sort((a, b) => a.id.localeCompare(b.id))
  }

  public async getNote(id: string): Promise<Note> {
    const doc = await this.ref.doc(id).get()

    return this.convertDocumentToNote(doc)
  }

  public async createNote(note: Note = this.generateNewNote()): Promise<Note> {
    const { id, ...newNote } = note

    await this.ref.doc(id).set(newNote)

    return note
  }

  public async updateContent(id: string, content: Descendant[]): Promise<void> {
    await this.ref.doc(id).update({
      content
    })
  }

  public async updateTitle(id: string, title: string): Promise<void> {
    await this.ref.doc(id).update({
      title
    })
  }
}
