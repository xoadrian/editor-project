import * as ws from 'ws';

export interface NoteWebSocket extends ws {
  noteId: string
  editorId: string
}
