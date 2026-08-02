/** Outbound links surfaced in the About card (and future module/community CTAs).
 *  Single source — set once here, rendered wherever needed. An empty string
 *  hides the slot (never render a dead link). */
export const APP_LINKS = {
  /** The app's own site: additional info, modules, community.
   *  sanctissimissa.online is the canonical home (usurped from HelloWord,
   *  operator 2026-07-14) with sanctissimissa.com as its alias (resolves,
   *  104.158.190.71 — redirect pairing decided at cutover);
   *  standroid.robin.mba stays as the deploy mirror until the DNS/nginx
   *  cutover lands. */
  appSite: 'https://sanctissimissa.online',
  appSiteLabel: 'sanctissimissa.online — info · modules · community',
  /** Operator's personal blog. Set by operator; '' hides the row. */
  blog: '',
  blogLabel: 'Robin’s blog',
} as const;
