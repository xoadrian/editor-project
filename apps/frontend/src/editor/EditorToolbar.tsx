import React, { MouseEventHandler } from 'react'
import { useSlate, useSlateStatic } from 'slate-react'
import { toggleBlock, toggleMark, isBlockActive, isMarkActive } from './helpers'
import { CustomElementType } from './CustomElement'
import { CustomText } from './CustomLeaf'
import { insertLink } from './insert-link'

interface ButtonProps {
  active: boolean
  onMouseDown: MouseEventHandler<HTMLButtonElement>
}

const Button: React.FC<ButtonProps> = ({ active, children, onMouseDown }) => (
  <button onMouseDown={onMouseDown} style={{ backgroundColor: active ? '#333' : 'white', color: active ? 'white' : '#333', border: '1px solid #eee' }}>{children}</button>
)

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
    <div>
      <MarkButton format="bold" icon="bold" />
      <MarkButton format="italic" icon="italic" />
      <MarkButton format="underline" icon="underlined" />
      <MarkButton format="code" icon="code" />
      <BlockButton format={CustomElementType.headingOne} icon="h1" />
      <BlockButton format={CustomElementType.headingTwo} icon="h2" />
      <BlockButton format={CustomElementType.blockQuote} icon="quote" />
      <BlockButton format={CustomElementType.numberedList} icon="list_numbered" />
      <BlockButton format={CustomElementType.bulletedList} icon="list_bulleted" />
      <LinkButton format={CustomElementType.link} icon="link"/>
    </div>
  )
}
