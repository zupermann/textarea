export function getSelectionRange() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    return sel.getRangeAt(0)
  }
  
  // Returns info about the current line where caret is, inside a plaintext-only contenteditable.
  export function getLineAroundCaret(editEl) {
    const range = getSelectionRange()
    if (!range) return null
    if (!range.collapsed) return null
  
    // In plaintext-only mode, there is typically a single text node,
    // but browsers may still create multiple text nodes. We normalize by
    // reading full textContent and mapping caret offset.
    const full = editEl.textContent ?? ''
    const caret = getCaretOffsetWithin(editEl)
    if (caret == null) return null
  
    const lineStart = full.lastIndexOf('\n', caret - 1) + 1
    const lineEndIdx = full.indexOf('\n', caret)
    const lineEnd = lineEndIdx === -1 ? full.length : lineEndIdx
    const lineText = full.slice(lineStart, lineEnd)
  
    return {
      fullText: full,
      caretOffset: caret,
      lineStart,
      lineEnd,
      lineText,
      caretCol: caret - lineStart,
    }
  }
  
  export function insertTextAtCaret(text) {
    // execCommand still works best for contenteditable/plaintext-only across browsers
    document.execCommand('insertText', false, text)
  }
  
  // Replace the entire current line (as identified by ctx) with newText,
  // then place caret at a position relative to the start of replaced line.
  export function replaceLineAndPlaceCaret(editEl, ctx, newLineText, caretPos) {
    const before = ctx.fullText.slice(0, ctx.lineStart)
    const after = ctx.fullText.slice(ctx.lineEnd)
    const updated = before + newLineText + after
  
    editEl.textContent = updated
  
    // Place caret:
    // caretPos = { lineOffset: number, col: number }
    // Find start of the original line in updated text.
    const base = ctx.lineStart
  
    // Compute caret offset inside updated content
    const linesInserted = newLineText.split('\n')
    let offset = base
  
    for (let i = 0; i < caretPos.lineOffset; i++) {
      offset += linesInserted[i].length + 1 // + newline
    }
    offset += caretPos.col
  
    setCaretOffsetWithin(editEl, offset)
  }
  
  function getCaretOffsetWithin(container) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const range = sel.getRangeAt(0)
  
    // Create a range from start of container to caret and measure its text length.
    const pre = document.createRange()
    pre.selectNodeContents(container)
    pre.setEnd(range.startContainer, range.startOffset)
    return pre.toString().length
  }
  
  function setCaretOffsetWithin(container, offset) {
    const range = document.createRange()
    range.selectNodeContents(container)
  
    const { node, nodeOffset } = findTextNodeAtOffset(container, offset)
    range.setStart(node, nodeOffset)
    range.collapse(true)
  
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }
  
  function findTextNodeAtOffset(container, offset) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
    let node = walker.nextNode()
    let remaining = offset
  
    // If there is no text node at all, create one
    if (!node) {
      const t = document.createTextNode('')
      container.appendChild(t)
      return { node: t, nodeOffset: 0 }
    }
  
    while (node) {
      const len = node.nodeValue.length
      if (remaining <= len) {
        return { node, nodeOffset: remaining }
      }
      remaining -= len
      node = walker.nextNode()
    }
  
    // If offset is beyond, clamp to end of last node
    const last = container.lastChild
    if (last && last.nodeType === Node.TEXT_NODE) {
      return { node: last, nodeOffset: last.nodeValue.length }
    }
  
    const t = document.createTextNode('')
    container.appendChild(t)
    return { node: t, nodeOffset: 0 }
  }
  