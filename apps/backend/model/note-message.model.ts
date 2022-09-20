import { Descendant, Operation } from 'slate'
import { Note } from './note.model'

export interface NoteMessage {
  type: 'note' | 'operations' | 'title' | 'update-content' | 'update-title' | 'fetch-notes' | 'create-note'
  message?: Note | Operation[] | Descendant[] | string
}
