import { getLineAroundCaret, replaceRange, setCaretOffsetWithin } from './selection.js'

export function installMarkdownHelpers(editEl) {
  editEl.addEventListener('keydown', (e) => {
    if (e.isComposing || e.defaultPrevented) return

    const ctx = getLineAroundCaret(editEl)
    if (!ctx) return

    // ENTER helpers
    if (e.key === 'Enter') {
      // --- Code fence auto-close ---
      if (ctx.lineText === '```' || ctx.lineText === '~~~') {
        e.preventDefault()
        const fence = ctx.lineText
        // Replace entire current line with fence\n\nfence, caret on middle empty line
        replaceRange(
          editEl,
          ctx.lineStart,
          ctx.lineEnd,
          `${fence}\n\n${fence}`,
          ctx.lineStart + fence.length + 1 // after first newline
        )
        return
      }

      // --- Blockquote continuation / exit ---
      // Matches "> " or ">" with optional content
      const quote = ctx.lineText.match(/^(\s*)>(\s?)(.*)$/)
      if (quote) {
        e.preventDefault()
        const indent = quote[1] ?? ''
        const hasSpace = quote[2] === ' '
        const rest = quote[3] ?? ''

        // If line is just ">" or "> " => exit quote: remove the marker
        if (rest.trim() === '') {
          // Replace the whole line with "" (or keep indent if you want)
          replaceRange(
            editEl,
            ctx.lineStart,
            ctx.lineEnd,
            indent,
            ctx.lineStart + indent.length
          )
          // and insert newline normally
          insertPlainNewline(editEl, ctx.lineStart + indent.length)
          return
        }

        // Continue quote with "> "
        insertPlain(editEl, ctx.caretOffset, `\n${indent}> `)
        return
      }

      // --- Unordered list continuation / exit ---
      // Example: "  - item"
      const ul = ctx.lineText.match(/^(\s*)([-*+])\s+(.*)$/)
      // Empty marker line: "  - " (no content)
      const ulEmpty = ctx.lineText.match(/^(\s*)([-*+])\s*$/)

      if (ulEmpty) {
        e.preventDefault()
        const indent = ulEmpty[1] ?? ''

        // Exit list: remove marker from current line and make it blank (keep indent optional)
        replaceRange(
          editEl,
          ctx.lineStart,
          ctx.lineEnd,
          indent,
          ctx.lineStart + indent.length
        )
        // Insert a newline (so you "leave" the list visually)
        insertPlainNewline(editEl, ctx.lineStart + indent.length)
        return
      }

      if (ul) {
        e.preventDefault()
        const indent = ul[1] ?? ''
        const bullet = ul[2]
        const rest = ul[3] ?? ''

        // If content is only whitespace, treat as empty marker exit
        if (rest.trim() === '') {
          replaceRange(
            editEl,
            ctx.lineStart,
            ctx.lineEnd,
            indent,
            ctx.lineStart + indent.length
          )
          insertPlainNewline(editEl, ctx.lineStart + indent.length)
          return
        }

        // Continue list
        insertPlain(editEl, ctx.caretOffset, `\n${indent}${bullet} `)
        return
      }

      // --- Ordered list continuation / exit ---
      const ol = ctx.lineText.match(/^(\s*)(\d+)\.\s+(.*)$/)
      const olEmpty = ctx.lineText.match(/^(\s*)(\d+)\.\s*$/)

      if (olEmpty) {
        e.preventDefault()
        const indent = olEmpty[1] ?? ''
        replaceRange(editEl, ctx.lineStart, ctx.lineEnd, indent, ctx.lineStart + indent.length)
        insertPlainNewline(editEl, ctx.lineStart + indent.length)
        return
      }

      if (ol) {
        e.preventDefault()
        const indent = ol[1] ?? ''
        const num = parseInt(ol[2], 10)
        const rest = ol[3] ?? ''

        if (rest.trim() === '') {
          replaceRange(editEl, ctx.lineStart, ctx.lineEnd, indent, ctx.lineStart + indent.length)
          insertPlainNewline(editEl, ctx.lineStart + indent.length)
          return
        }

        insertPlain(editEl, ctx.caretOffset, `\n${indent}${num + 1}. `)
        return
      }

      return
    }

    // BACKSPACE helpers: if user is on an "empty marker line", backspace should remove marker easily
    if (e.key === 'Backspace') {
      // Only when caret is at end of line (common case when you just created "- ")
      if (ctx.caretCol !== ctx.lineText.length) return

      // "- " or "*" or "+", possibly with indent
      const ulEmpty = ctx.lineText.match(/^(\s*)([-*+])\s*$/)
      if (ulEmpty) {
        e.preventDefault()
        const indent = ulEmpty[1] ?? ''
        replaceRange(editEl, ctx.lineStart, ctx.lineEnd, indent, ctx.lineStart + indent.length)
        return
      }

      // "1. " etc
      const olEmpty = ctx.lineText.match(/^(\s*)(\d+)\.\s*$/)
      if (olEmpty) {
        e.preventDefault()
        const indent = olEmpty[1] ?? ''
        replaceRange(editEl, ctx.lineStart, ctx.lineEnd, indent, ctx.lineStart + indent.length)
        return
      }

      // "> " quote marker
      const quoteEmpty = ctx.lineText.match(/^(\s*)>\s*$/)
      if (quoteEmpty) {
        e.preventDefault()
        const indent = quoteEmpty[1] ?? ''
        replaceRange(editEl, ctx.lineStart, ctx.lineEnd, indent, ctx.lineStart + indent.length)
        return
      }
    }
  })
}

// Insert plain text at offset by splicing textContent (guarantees real \n)
function insertPlain(editEl, offset, text) {
  const full = editEl.textContent ?? ''
  const updated = full.slice(0, offset) + text + full.slice(offset)
  editEl.textContent = updated
  setCaretOffsetWithin(editEl, offset + text.length)
}

function insertPlainNewline(editEl, offset) {
  insertPlain(editEl, offset, '\n')
}
