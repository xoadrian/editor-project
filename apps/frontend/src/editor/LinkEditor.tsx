import { Button, Card, CardContent, Input } from '@mui/material'
import isUrl from 'is-url'
import React, { useEffect, useRef, useState } from 'react'
import { BaseSelection, Path, Transforms } from 'slate'
import { ReactEditor, useSlate } from 'slate-react'

import { CustomElement } from './CustomElement'
import { toggleLinkAtSelection } from './helpers'
import styles from './LinkEditor.module.scss'

interface LinkEditorProps {
  linkNodeAndPath: [CustomElement | null, Path | null]
  selectionForLink: BaseSelection | null
  setSelectionForLink: (selection: BaseSelection) => void
  editorOffsets: { x: number, y: number } | null
}

export const LinkEditor: React.FC<LinkEditorProps> = ({ linkNodeAndPath, selectionForLink, setSelectionForLink, editorOffsets }) => {
  const editor = useSlate()
  const linkEditorRef = useRef<HTMLDivElement>(null)
  const [linkNode, path] = linkNodeAndPath

  const [linkURL, setLinkURL] = useState(linkNode?.href ?? '');
  const [isEditFormVisible, setEditForVisible] = useState(!linkNode?.href)

  const onLinkURLChange = (value: string): void => {
    setLinkURL(value)
  }

  const onApply = (): void => {
    Transforms.setNodes(editor, { href: linkURL }, { at: path as Path });
    setSelectionForLink(null)
  }

  // update state if `linkNode` changes
  useEffect(() => {
    setLinkURL(linkNode?.href ?? '');
  }, [linkNode]);

  useEffect(() => {
    if (editorOffsets == null /*|| !isLink*/) {
      return
    }

    const linkEditorEl = linkEditorRef.current;
    if (linkEditorEl == null) {
      return
    }

    if (!linkNode) {
      return
    }

    const linkDOMNode = ReactEditor.toDOMNode(editor, linkNode);
    const {
      x: nodeX,
      height: nodeHeight,
      y: nodeY,
    } = linkDOMNode.getBoundingClientRect();

    linkEditorEl.style.display = 'block'
    linkEditorEl.style.top = `${nodeY + nodeHeight - editorOffsets.y}px`;
    linkEditorEl.style.left = `${nodeX - editorOffsets.x}px`;
  }, [selectionForLink, editorOffsets?.x, editorOffsets?.y]);

  return (
    <Card ref={linkEditorRef} className={styles.linkEditor}>
      <CardContent className={styles.cardContent}>
        {isEditFormVisible ? <div className={styles.editForm}>
          <Input type='text' value={linkURL} onChange={(event) => onLinkURLChange(event.target.value)}/>
          <Button
            className={styles.linkEditorBtn}
            size='small'
            disabled={!isUrl(linkURL)}
            onClick={onApply}
          >
            Apply
          </Button>
        </div>
          : null
        }
        {!isEditFormVisible ? <div className={styles.viewLink}>
          <a href={linkNode?.href} target='_blank' rel="noreferrer">{linkNode?.href}</a>
          <div>
            <span
              className={`material-icons ${styles.materialIcon}`}
              onMouseDown={() => setEditForVisible(true)}
            >
            <span>edit</span>
          </span>
            <span
              className={`material-icons ${styles.materialIcon}`}
              onMouseDown={() => toggleLinkAtSelection(editor, selectionForLink)}
            >
            <span>link_off</span>
          </span>
          </div>
        </div>
          : null
        }
      </CardContent>
    </Card>
  )
}
