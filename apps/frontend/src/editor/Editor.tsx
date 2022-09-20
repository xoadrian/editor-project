// @refresh reset // Fixes hot refresh errors in development https://github.com/ianstormtaylor/slate/issues/3477

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createEditor, Descendant, BaseEditor, Operation, Editor as SlateEditor } from 'slate'
import { withHistory, HistoryEditor } from 'slate-history'
import { useDebounce } from 'usehooks-ts'
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
  initialValue?: Descendant[]
  operations: Operation[]
  updateContent: (value: Descendant[]) => void
  sendOperations: (value: Operation[]) => void
  placeholder?: string
}

export const Editor: React.FC<EditorProps> = ({
    initialValue = [],
    operations,
    updateContent,
    sendOperations,
    placeholder
  }) => {
  const [value, setValue] = useState<Array<Descendant>>(initialValue)
  // use this variable to differentiate between all value changes and own value changes
  const [ownValue, setOwnValue] = useState<Descendant[]>(initialValue)
  const debouncedOwnValue = useDebounce<Descendant[]>(ownValue, 500)
  const renderElement = useCallback(props => <CustomElement {...props} />, [])
  const renderLeaf = useCallback(props => <CustomLeaf {...props} />, [])
  const editor = useMemo(() => withGoogleDoc(withHistory(withReact(createEditor()))), [])
  const remote = useRef(false)

  useEffect(() => {
    if (debouncedOwnValue === initialValue) {
      return
    }

    // we update the note only if we own the changes
    updateContent(debouncedOwnValue)
  }, [debouncedOwnValue])

  useEffect(() => {
    if (!operations || !operations.length) {
      return
    }

    // mark changes as remote to stop propagation
    remote.current = true
    applyOperations(operations)

    // Move remote flag to next tick so that onChange is fired before
    setTimeout(() => {
      remote.current = false
    })
  }, [operations])

  const applyOperations = (operations: Operation[]) => {
    // prevent Slate to normalize the document in-between the operations
    SlateEditor.withoutNormalizing(editor, () => {
      operations.forEach(operation => editor.apply(operation))
    })
  }

  const onChange = (value: Descendant[]) => {
    setValue(value)

    if (!remote.current) {
      // filter out selection operations
      const operations = editor.operations.filter(operation => operation.type !== 'set_selection')

      if (operations.length) {
        setOwnValue(value)
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
