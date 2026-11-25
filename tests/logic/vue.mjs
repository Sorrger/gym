export * from '../../node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js'
// component lifecycle hooks do nothing outside a component
export const onMounted = () => {}, onUnmounted = () => {}, nextTick = fn => Promise.resolve().then(fn)
