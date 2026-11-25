import { createAnimation } from '@ionic/vue'
// Light page transition (iOS-like slide) that only moves the pages – Ionic's own iOS transition clones and
// animates every header and back button, which is slow on the phone.
export function pageAnim(_, opts) {
  const back = opts.direction === 'back'
  const root = createAnimation().duration(opts.duration ?? 300).easing('cubic-bezier(0.32, 0.72, 0, 1)')
  // the entering page gets the app background while it slides (otherwise iOS can show it black)
  const enter = createAnimation().addElement(opts.enteringEl).beforeRemoveClass('ion-page-invisible')
    .beforeStyles({ background: 'var(--app-bg)' }).afterClearStyles(['background', 'transform', 'opacity']).afterRemoveClass('ion-page-invisible')
  if (back) enter.fromTo('transform', 'translateX(-30%)', 'translateX(0)').fromTo('opacity', '0.7', '1')
  else enter.fromTo('transform', 'translateX(100%)', 'translateX(0)')
  root.addAnimation(enter)
  if (opts.leavingEl) {
    const leave = createAnimation().addElement(opts.leavingEl).afterClearStyles(['transform', 'opacity'])
    if (back) leave.fromTo('transform', 'translateX(0)', 'translateX(100%)')
    else leave.fromTo('transform', 'translateX(0)', 'translateX(-30%)').fromTo('opacity', '1', '0.7')
    root.addAnimation(leave)
  }
  return root
}
