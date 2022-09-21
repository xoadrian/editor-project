import React, { CSSProperties, MouseEventHandler } from 'react'
import { useSlate, useSlateStatic } from 'slate-react'
import { toggleBlock, toggleMark, isBlockActive, isMarkActive } from './helpers'
import { CustomElementType } from './CustomElement'
import { CustomText } from './CustomLeaf'
import { insertLink } from './insert-link'
import styles from './EditorToolbar.module.scss'

interface ButtonProps {
  active: boolean
  onMouseDown: MouseEventHandler<HTMLButtonElement>
}

const Button: React.FC<ButtonProps> = ({ active, children, onMouseDown }) => {
  return <button className={`material-icons ${styles.button} ${active ? styles.active : ''}`} onMouseDown={onMouseDown}>{children}</button>
}

const Icon: React.FC = ({ children }) => (
  <span>{children}</span>
)

interface BlockButtonProps {
  format: CustomElementType
  icon: string
}

const BlockButton: React.FC<BlockButtonProps> = ({ format, icon }) => {
  const editor = useSlate()
  return (
    <Button
      active={isBlockActive(editor, format)}
      onMouseDown={(event) => {
        event.preventDefault()
        toggleBlock(editor, format)
      }}
    >
      <Icon>{icon}</Icon>
    </Button>
  )
}

interface MarkButtonProps {
  format: keyof CustomText
  icon: string
}


const MarkButton: React.FC<MarkButtonProps> = ({ format, icon }) => {
  const editor = useSlate()
  return (
    <Button
      active={isMarkActive(editor, format)}
      onMouseDown={(event) => {
        event.preventDefault()
        toggleMark(editor, format)
      }}
    >
      <Icon>{icon}</Icon>
    </Button>
  )
}

const LinkButton: React.FC<BlockButtonProps> = ({ icon }) => {
  const editor = useSlateStatic()

  const handleInsertLink = () => {
    const url = prompt("Enter a URL"); // For simplicity
    insertLink(editor, url);
  };

  return (
    <Button
      active={false}
      onMouseDown={handleInsertLink}
    >
      <Icon>{icon}</Icon>
    </Button>
  )
}

export const EditorToolbar: React.FC = () => {
  return (
    <div className={styles.toolbar}>
      <MarkButton format="bold" icon="format_bold" />
      <MarkButton format="italic" icon="format_italic" />
      <MarkButton format="underline" icon="format_underlined" />
      <MarkButton format="code" icon="code" />
      <BlockButton format={CustomElementType.headingOne} icon="looks_one" />
      <BlockButton format={CustomElementType.headingTwo} icon="looks_two" />
      <BlockButton format={CustomElementType.blockQuote} icon="format_quote" />
      <BlockButton format={CustomElementType.numberedList} icon="format_list_numbered" />
      <BlockButton format={CustomElementType.bulletedList} icon="format_list_bulleted" />
      <LinkButton format={CustomElementType.link} icon="link"/>
    </div>
  )
}
