import { getSelectionRange, getLineAroundCaret, replaceLineAndPlaceCaret, insertTextAtCaret } from './selection.js'

export function installMarkdownHelpers(editEl) {
  // Use keydown so we can prevent default Enter and insert our own text.
  editEl.addEventListener('keydown', (e) => {
    if (e.isComposing) return
    if (e.defaultPrevented) return

    // Only operate when caret is inside the editor
    const range = getSelectionRange()
    if (!range) return
    if (!editEl.contains(range.startContainer)) return
    if (!range.collapsed) return

    // Enter-based helpers
    if (e.key === 'Enter') {
      const ctx = getLineAroundCaret(editEl)
      if (!ctx) return

      // 1) Code fence auto-close: ``` or ~~~
      if (ctx.lineText === '```' || ctx.lineText === '~~~') {
        e.preventDefault()
        const fence = ctx.lineText
        // Replace current line with:
        // ```\n\n```
        // caret goes on empty line
        replaceLineAndPlaceCaret(editEl, ctx, `${fence}\n\n${fence}`, { lineOffset: 1, col: 0 })
        return
      }

      // 2) Blockquote continuation: "> "
      const quoteMatch = ctx.lineText.match(/^(>\s?)(.*)$/)
      if (quoteMatch) {
        e.preventDefault()
        const prefix = quoteMatch[1] // ">" or "> "
        const rest = quoteMatch[2] ?? ''

        // If user is on an "empty quote marker" line, stop quoting
        if (rest.trim() === '' && ctx.lineText.trim() === '>') {
          // Just insert a normal newline (no prefix)
          insertTextAtCaret('\n')
          return
        }

        // Continue quote with "> "
        insertTextAtCaret('\n' + (prefix.endsWith(' ') ? prefix : '> '))
        return
      }

      // 3) List continuation: -, *, +, or numbered list "1."
      const ul = ctx.lineText.match(/^(\s*)([-*+])\s+(.*)$/)
      const ol = ctx.lineText.match(/^(\s*)(\d+)\.\s+(.*)$/)

      if (ul) {
        e.preventDefault()
        const indent = ul[1]
        const bullet = ul[2]
        const rest = ul[3] ?? ''

        // If line is just "- " (no content), stop list
        if (rest.trim() === '') {
          insertTextAtCaret('\n')
          return
        }

        insertTextAtCaret('\n' + indent + bullet + ' ')
        return
      }

      if (ol) {
        e.preventDefault()
        const indent = ol[1]
        const num = parseInt(ol[2], 10)
        const rest = ol[3] ?? ''

        // If line is just "1. " (no content), stop list
        if (rest.trim() === '') {
          insertTextAtCaret('\n')
          return
        }

        insertTextAtCaret('\n' + indent + (num + 1) + '. ')
        return
      }

      return
    }

    // Optional: Tab indentation for lists/quotes (very handy, still minimal)
    if (e.key === 'Tab') {
      const ctx = getLineAroundCaret(editEl)
      if (!ctx) return

      // Only tab-indent when we’re on a markdown-structured line
      const isMdLine =
        /^(\s*)([-*+])\s+/.test(ctx.lineText) ||
        /^(\s*)(\d+)\.\s+/.test(ctx.lineText) ||
        /^(>\s?)/.test(ctx.lineText)

      if (!isMdLine) return

      e.preventDefault()
      if (e.shiftKey) {
        // outdent: remove up to 2 leading spaces
        const outdented = ctx.lineText.replace(/^ {1,2}/, '')
        replaceLineAndPlaceCaret(editEl, ctx, outdented, { lineOffset: 0, col: Math.max(0, ctx.caretCol - 2) })
      } else {
        // indent: add 2 spaces
        const indented = '  ' + ctx.lineText
        replaceLineAndPlaceCaret(editEl, ctx, indented, { lineOffset: 0, col: ctx.caretCol + 2 })
      }
      return
    }
  })
}
