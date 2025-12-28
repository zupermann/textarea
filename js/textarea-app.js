import { debounce } from './utils.js'
import { installMarkdownHelpers } from './md-helpers.js'

export function initEditorApp({ editorSelector, linkQrSelector, linkMdSelector }) {
  const article = document.querySelector(editorSelector)
  if (!article) throw new Error(`Editor not found: ${editorSelector}`)

  const linkQr = document.querySelector(linkQrSelector)
  const linkMd = document.querySelector(linkMdSelector)

  // --- your event wiring (unchanged logic) ---
  article.addEventListener('input', debounce(500, save))
  article.addEventListener('blur', save)

  addEventListener('DOMContentLoaded', load)
  addEventListener('hashchange', load)
  addEventListener('pageshow', (e) => {
    if (e.persisted) load()
    queueMicrotask(() => article.focus())
  })

  addEventListener('load', () => {
    new MutationObserver(save).observe(article, { attributeFilter: ['style'] })
  })

  addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      download()
    }
  })

  // Markdown helper hints
  installMarkdownHelpers(article)

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
  }

  function updateLinks() {
    const hash = location.hash || ''
    if (linkQr) linkQr.href = '/qr?from=edit' + hash
    if (linkMd) linkMd.href = '/md' + hash
  }

  addEventListener('DOMContentLoaded', updateLinks)
  addEventListener('hashchange', updateLinks)

  async function load() {
    try {
      if (location.hash !== '') await set(location.hash)
      else {
        await set(localStorage.getItem('hash') ?? '')
        if (article.textContent) history.replaceState({}, '', await get())
        article.focus()
      }
    } catch (e) {
      article.textContent = ''
      article.removeAttribute('style')
      article.focus()
    }
    updateTitle()
    updateLinks()
  }

  async function save() {
    const hash = await get()
    if (location.hash !== hash) history.replaceState({}, '', hash)
    try { localStorage.setItem('hash', hash) } catch (e) {}
    updateTitle()
    updateLinks()
  }

  async function set(hash) {
    if (!hash) return
    const [content, style] = (await decompress(hash.slice(1))).split('\x00')
    article.textContent = content
    if (style) article.setAttribute('style', style)
    else article.removeAttribute('style')
  }

  async function get() {
    const style = article.getAttribute('style')
    const content = article.textContent + (style !== null ? '\x00' + style : '')
    return '#' + await compress(content)
  }

  function updateTitle() {
    const match = article.textContent.match(/^\n*#(.+)\n/)
    document.title = match?.[1] ?? 'Textarea'
  }

  async function compress(string) {
    const byteArray = new TextEncoder().encode(string)
    const stream = new CompressionStream('deflate-raw')
    const writer = stream.writable.getWriter()
    writer.write(byteArray)
    writer.close()
    const buffer = await new Response(stream.readable).arrayBuffer()
    return new Uint8Array(buffer).toBase64({ alphabet: 'base64url' })
  }

  async function decompress(b64) {
    const byteArray = Uint8Array.fromBase64(b64, { alphabet: 'base64url' })
    const stream = new DecompressionStream('deflate-raw')
    const writer = stream.writable.getWriter()
    writer.write(byteArray)
    writer.close()
    const buffer = await new Response(stream.readable).arrayBuffer()
    return new TextDecoder().decode(buffer)
  }

  async function download() {
    updateTitle()
    const doc = document.documentElement.cloneNode(true)
    doc.querySelectorAll('script').forEach(s => s.remove())
    doc.querySelector('article').removeAttribute('contenteditable')
    const html = '<!DOCTYPE html>\n' + doc.outerHTML

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await showSaveFilePicker({
          suggestedName: document.title + '.html',
          types: [{
            description: 'HTML file',
            accept: { 'text/html': ['.html'] },
          }],
        })
        const writable = await handle.createWritable()
        await writable.write(html)
        await writable.close()
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = document.title + '.html'
    a.click()
    URL.revokeObjectURL(url)
  }
}
