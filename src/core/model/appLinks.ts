/** Outbound links surfaced in the About card (and future module/community CTAs).
 *  Single source — set once here, rendered wherever needed. An empty string
 *  hides the slot (never render a dead link). */
export const APP_LINKS = {
  /** SanctissiMissa's configured information, modules and community site. */
  appSite: 'https://sanctissimissa.online',
  appSiteLabel: 'sanctissimissa.online — info · modules · community',
  /** Operator's personal blog. Set by operator; '' hides the row. */
  blog: '',
  blogLabel: 'Robin’s blog',
} as const;
