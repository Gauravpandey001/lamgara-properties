import { useEffect } from 'react'

const upsertMeta = (selector, createAttrs, content) => {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(createAttrs).forEach(([key, value]) => {
      element.setAttribute(key, value)
    })
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function usePageSeo({ title, description, robots = 'index,follow' }) {
  useEffect(() => {
    if (title) document.title = title
    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description' }, description)
      upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description)
    }
    if (title) {
      upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title)
    }
    upsertMeta('meta[name="robots"]', { name: 'robots' }, robots)
  }, [title, description, robots])
}

export default usePageSeo
