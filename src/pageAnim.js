import { createAnimation } from '@ionic/vue'
// Light page transition (iOS-like slide). Ionic's own iOS transition also clones and animates every header,
// title and back button – on the phone going back to Start took 1,5-2 s (Nov 21 2026). This one only moves the pages.
export function pageAnim(_, opts) {
  const back = opts.direction === 'back'
  const root = createAnimation().duration(opts.duration ?? 300).easing('cubic-bezier(0.32, 0.72, 0, 1)')
  const enter = createAnimation().addElement(opts.enteringEl).beforeRemoveClass('ion-page-invisible')
  if (back) enter.fromTo('transform', 'translateX(-30%)', 'translateX(0)').fromTo('opacity', '0.7', '1')
  else enter.fromTo('transform', 'translateX(100%)', 'translateX(0)')
  root.addAnimation(enter)
  if (opts.leavingEl) {
    const leave = createAnimation().addElement(opts.leavingEl)
    if (back) leave.fromTo('transform', 'translateX(0)', 'translateX(100%)')
    else leave.fromTo('transform', 'translateX(0)', 'translateX(-30%)').fromTo('opacity', '1', '0.7')
    root.addAnimation(leave)
  }
  return root
}
