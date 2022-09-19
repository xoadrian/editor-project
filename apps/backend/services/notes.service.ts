import { firestore } from 'firebase-admin'

import { Note } from '../model/note.model'
import db from '../firebase'

export class NotesService {
  private readonly ref = db.collection('notes')

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

    return snapshot.docs.map(doc => this.convertDocumentToNote(doc))
  }

  public async getNote(id: string): Promise<Note | undefined> {
    const doc = await this.ref.doc(id).get()

    return this.convertDocumentToNote(doc)
  }

  public async updateNote(note: Note): Promise<Note | undefined> {
    const { id, ...noteToUpdate } = note

    await this.ref.doc(id).set(noteToUpdate/*, { merge: true }*/)

    return note
  }
}
