import { firestore } from 'firebase-admin'
import { Operation } from 'slate'

import db from '../firebase'
import { OperationsResponse } from '../routes/notes'

export class OperationsService {
  private readonly ref = db.collection('operations')

  public getRef(): firestore.CollectionReference {
    return this.ref
  }

  public getChangesForEditor(doc: firestore.DocumentSnapshot, editorId: string): Operation[] {
    const operations: Operation[] = []
    Object.entries(doc.data() as OperationsResponse).forEach(([key, value]) => {
      // get all remote changes that don't belong to our editor
      if (key !== editorId) {
        operations.push(...value)
      }
    })

    return operations
  }

  public async save(id: string, editorId: string, operations: Operation[]) {
    await this.ref.doc(id).set({
      [editorId]: operations
    })
  }
}
