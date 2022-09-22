import * as ws from 'ws';

import { getNoteWebSocket } from './get-note-web-socket'

describe('getNoteWebSocket', () => {
  it('should add to websocket properties: noteId, editorId', () => {
    const ws = {} as ws
    const noteId = 'noteId'
    const editorId = 'editorId'

    const enhancedWs = getNoteWebSocket(ws, noteId, editorId)

    expect(enhancedWs).toBe(ws)
    expect(enhancedWs.noteId).toBe(noteId)
    expect(enhancedWs.editorId).toBe(editorId)
  })
})
