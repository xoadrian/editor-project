import * as ws from 'ws';

import { NoteWebSocket } from '../model/note-web-socket.model'

export function getNoteWebSocket (ws: ws, noteId: string, editorId: string): NoteWebSocket {
  return Object.assign(ws, { noteId, editorId })
}
