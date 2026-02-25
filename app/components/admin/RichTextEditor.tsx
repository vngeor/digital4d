"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Color from "@tiptap/extension-color"
import { TextStyle } from "@tiptap/extension-text-style"
import Underline from "@tiptap/extension-underline"
import { useEffect, useRef, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  ImageIcon,
  Palette,
  Upload,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  error?: boolean
}

export function RichTextEditor({ value, onChange, error }: RichTextEditorProps) {
  const tc = useTranslations("admin.common")
  const colorInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-emerald-400 underline hover:text-emerald-300",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[120px] sm:min-h-[150px] p-4 focus:outline-none text-white " +
          "prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white " +
          "prose-ul:text-slate-300 prose-ol:text-slate-300 prose-blockquote:border-emerald-500 " +
          "prose-blockquote:text-slate-400 prose-a:text-emerald-400",
      },
    },
  })

  // Sync external value changes (e.g. tab switch)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "")
    }
  }, [editor, value])

  const handleInsertLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL", previousUrl)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const handleInsertImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt("Image URL (or upload below)")
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !editor) return

      uploadingRef.current = true
      try {
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const error = await res.json()
          toast.error(error.error || tc("uploadFailed"))
          return
        }

        const data = await res.json()
        editor.chain().focus().setImage({ src: data.url }).run()
      } catch (err) {
        console.error("Upload error:", err)
        toast.error(tc("uploadImageFailed"))
      } finally {
        uploadingRef.current = false
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    },
    [editor]
  )

  if (!editor) {
    return (
      <div className={`border rounded-xl bg-white/5 min-h-[200px] flex items-center justify-center ${
        error ? "border-red-500" : "border-white/10"
      }`}>
        <span className="text-gray-500 text-sm">Loading editor...</span>
      </div>
    )
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    children,
    title,
  }: {
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        isActive
          ? "bg-emerald-500/30 text-emerald-400"
          : "text-gray-400 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  )

  return (
    <div
      className={`border rounded-xl overflow-hidden ${
        error ? "border-red-500" : "border-white/10 focus-within:border-emerald-500/50"
      } transition-colors bg-white/5`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-white/10 bg-white/5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <div className="relative">
          <ToolbarButton
            onClick={() => colorInputRef.current?.click()}
            isActive={false}
            title="Text Color"
          >
            <Palette className="w-4 h-4" />
          </ToolbarButton>
          <input
            ref={colorInputRef}
            type="color"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </div>

        <ToolbarButton onClick={handleInsertLink} isActive={editor.isActive("link")} title="Insert Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton onClick={handleInsertImage} isActive={false} title="Insert Image (URL)">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="relative">
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            isActive={false}
            title="Upload Image"
          >
            <Upload className="w-4 h-4" />
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}