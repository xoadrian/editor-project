// @refresh reset // Fixes hot refresh errors in development https://github.com/ianstormtaylor/slate/issues/3477

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createEditor, Descendant, BaseEditor, Operation, Editor as SlateEditor } from 'slate'
import { withHistory, HistoryEditor } from 'slate-history'
import { useDebounce } from 'usehooks-ts'
import { useOperations } from '../notes/hooks'
import { withGoogleDoc } from '../plugins/with-google-doc'
import { handleHotkeys } from './helpers'

import { Editable, withReact, Slate, ReactEditor } from 'slate-react'
import { EditorToolbar } from './EditorToolbar'
import { CustomElement } from './CustomElement'
import { CustomLeaf, CustomText } from './CustomLeaf'

// Slate suggests overwriting the module to include the ReactEditor, Custom Elements & Text
// https://docs.slatejs.org/concepts/12-typescript
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: CustomElement
    Text: CustomText
  }
}

interface EditorProps {
  noteId: string,
  initialValue?: Descendant[]
  updateContent: (value: Descendant[]) => void
  placeholder?: string
}

export const Editor: React.FC<EditorProps> = ({
    noteId,
    initialValue = [],
    updateContent,
    placeholder
  }) => {
  const [value, setValue] = useState<Array<Descendant>>(initialValue)
  const renderElement = useCallback(props => <CustomElement {...props} />, [])
  const renderLeaf = useCallback(props => <CustomLeaf {...props} />, [])
  const editor = useMemo(() => withGoogleDoc(withHistory(withReact(createEditor()))), [])
  const id = useRef(`${Date.now()}`)
  const { operations, sendMessage } = useOperations(noteId, id.current)
  const debouncedValue = useDebounce<Descendant[]>(value, 500)
  // TODO: uuid would be better
  const remote = useRef(false)

  useEffect(() => {
    console.log('userEffect::: debounce:::', debouncedValue === initialValue)
    if (debouncedValue === initialValue) {
      return
    }

    // const [operation] = editor.operations
    // console.log(editor.operations)
    // if (editor.operations.length === 0 ||
    //   (editor.operations.length === 1 && operation.type === 'set_selection')
    // ) {
    //   // no need to trigger any update if there are no editor operations, on cursor position change or text selection
    //   return
    // }
    console.log('updateContent::: ', debouncedValue)
    updateContent(debouncedValue)
  }, [debouncedValue])

  // useEffect(() => {
  //   console.log('useEffect::: initialValue::: ', initialValue === value)
  //   setValue(initialValue)
  // }, [initialValue])

  useEffect(() => {
    console.log('useEffect::: operations::: ', operations)
    // mark changes as remote to stop propagation
    remote.current = true
    applyOperations(operations)

    // Move remote flag to next tick so that onChange is fired before
    setTimeout(() => {
      remote.current = false
    })
  }, [operations])

  const sendOperations = (value: Operation[]) => {
    console.log('sendOperations::: ', value)
    sendMessage(JSON.stringify(value))
  }

  const applyOperations = (operations: Operation[] | null) => {
    if (!operations || !operations.length) {
      return
    }

    // prevent Slate to normalize the document in-between the operations
    SlateEditor.withoutNormalizing(editor, () => {
      operations.forEach(operation => editor.apply(operation))
    })
  }

  const onChange = (value: Descendant[]) => {
    console.log('onChange::: ', editor.operations, remote.current)
    setValue(value)
    console.log((editor as any).withoutNormalizing)

    if (!remote.current) {
      // filter out selection operations
      const operations = editor.operations.filter(operation => operation.type !== 'set_selection')

      if (operations.length) {
        sendOperations(operations)
      }
    }
  }

  return (
    <Slate editor={editor} value={value} onChange={onChange}>
      <EditorToolbar />
      <Editable
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder={placeholder}
        onKeyDown={handleHotkeys(editor)}

        // The dev server injects extra values to the editr and the console complains
        // so we override them here to remove the message
        autoCapitalize="false"
        autoCorrect="false"
        spellCheck="false"
      />
    </Slate>
  )
}
