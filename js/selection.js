export function getLineAroundCaret(editEl) {
    const caretOffset = getCaretOffsetWithin(editEl)
    if (caretOffset == null) return null
  
    const full = editEl.textContent ?? ''
    const lineStart = full.lastIndexOf('\n', caretOffset - 1) + 1
    const nextNl = full.indexOf('\n', caretOffset)
    const lineEnd = nextNl === -1 ? full.length : nextNl
    const lineText = full.slice(lineStart, lineEnd)
  
    return {
      fullText: full,
      caretOffset,
      lineStart,
      lineEnd,
      lineText,
      caretCol: caretOffset - lineStart,
    }
  }
  
  export function replaceRange(editEl, start, end, insert, caretOffset) {
    const full = editEl.textContent ?? ''
    const updated = full.slice(0, start) + insert + full.slice(end)
    editEl.textContent = updated
    setCaretOffsetWithin(editEl, caretOffset)
  }
  
  export function setCaretOffsetWithin(container, offset) {
    const range = document.createRange()
    range.selectNodeContents(container)
  
    const { node, nodeOffset } = findTextNodeAtOffset(container, offset)
    range.setStart(node, nodeOffset)
    range.collapse(true)
  
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }
  
  function getCaretOffsetWithin(container) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const range = sel.getRangeAt(0)
    if (!container.contains(range.startContainer)) return null
  
    const pre = document.createRange()
    pre.selectNodeContents(container)
    pre.setEnd(range.startContainer, range.startOffset)
    return pre.toString().length
  }
  
  function findTextNodeAtOffset(container, offset) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null)
    let node = walker.nextNode()
    let remaining = offset
  
    if (!node) {
      const t = document.createTextNode('')
      container.appendChild(t)
      return { node: t, nodeOffset: 0 }
    }
  
    while (node) {
      const len = node.nodeValue.length
      if (remaining <= len) return { node, nodeOffset: remaining }
      remaining -= len
      node = walker.nextNode()
    }
  
    // clamp
    const last = container.lastChild
    if (last && last.nodeType === Node.TEXT_NODE) {
      return { node: last, nodeOffset: last.nodeValue.length }
    }
    const t = document.createTextNode('')
    container.appendChild(t)
    return { node: t, nodeOffset: 0 }
  }
  