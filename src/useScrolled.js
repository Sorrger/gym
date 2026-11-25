import { ref } from 'vue'
// tab pages draw their own large title (no Ionic collapse header – it appears late on the phone);
// a small title bar fades in once the large title is scrolled away
export function useScrolled(px = 40) {
  const scrolled = ref(false)
  return { scrolled, onScroll: e => { const v = e.detail.scrollTop > px; if (v !== scrolled.value) scrolled.value = v } }
}
