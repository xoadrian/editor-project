// @refresh reset // Fixes hot refresh errors in development https://github.com/ianstormtaylor/slate/issues/3477

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BaseEditor, BaseSelection, createEditor, Descendant, Editor as SlateEditor, Operation, Path } from 'slate'
import { HistoryEditor, withHistory } from 'slate-history'

import { Editable, ReactEditor, Slate, withReact } from 'slate-react'
import { useDebounce } from 'usehooks-ts'
import { withGoogleDoc } from '../plugins/with-google-doc'
import { CustomElement, CustomElementType } from './CustomElement'
import { CustomLeaf, CustomText } from './CustomLeaf'
import styles from './Editor.module.scss'
import { EditorToolbar } from './EditorToolbar'
import { handleHotkeys, isLinkNodeAtSelection } from './helpers'
import { useSelectionFromOperations } from './hooks'
import { LinkEditor } from './LinkEditor'

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
  const editorRef = useRef<HTMLDivElement>(null)
  const [previousSelection, selection, setSelectionFromOperations] = useSelectionFromOperations()
  const [selectionForLink, setSelectionForLink] = useState<BaseSelection>(null)
  const [linkNodeAndPath, setLinkNodeAndPath] = useState<[CustomElement | null, Path | null]>([null, null])

  const findAndSetLinkNode = (selection: BaseSelection) => {
    const [linkNode, path] = (SlateEditor.above(editor, {
      at: selection ?? undefined,
      match: (n) => (n as CustomElement).type === CustomElementType.link,
    }) ?? []) as [CustomElement, Path];
    setLinkNodeAndPath([linkNode ,path])
  }

  useEffect(() => {
    if (isLinkNodeAtSelection(editor, selection)) {
      setSelectionForLink(selection)
      findAndSetLinkNode(selection)
    } else if (selection == null && isLinkNodeAtSelection(editor, previousSelection)) {
      setSelectionForLink(previousSelection)
      findAndSetLinkNode(previousSelection)
    } else {
      setSelectionForLink(null)
    }
  }, [previousSelection, selection])

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
    try {
      SlateEditor.withoutNormalizing(editor, () => {
        operations.forEach(operation => editor.apply(operation))
      })
   } catch (e) {
      console.log('Error applying remote changes', e)
    }

  }

  const onChange = (value: Descendant[]) => {
    setValue(value)
    setSelectionFromOperations(editor.operations)

    if (!remote.current) {
      // filter out selection operations
      const operations = editor.operations.filter(operation => operation.type !== 'set_selection')

      if (operations.length) {
        setOwnValue(value)
        sendOperations(operations)
      }
    }
  }

  const editorOffsets = (): null | { x: number, y: number } => {
    if (editorRef.current == null) {
      return null
    }

    return {
      x: editorRef.current.getBoundingClientRect().x,
      y: editorRef.current.getBoundingClientRect().y,
    }
  }

  return (
    <div ref={editorRef} className={styles.editor}>
      <Slate editor={editor} value={value} onChange={onChange}>
        <EditorToolbar />
        { selectionForLink
          ? <LinkEditor
            linkNodeAndPath={linkNodeAndPath}
            selectionForLink={selectionForLink}
            setSelectionForLink={setSelectionForLink}
            editorOffsets={editorOffsets()}/>
          : null
        }
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
    </div>
  )
}
