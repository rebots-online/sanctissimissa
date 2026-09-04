/**
 * LinkPolicy — CKEditor plugin replicating AccompanimentEditor's href policy:
 * only https:// absolute links and internal app routes (#/verse/ #/section/
 * #/day/ #/acc/) are accepted. CKEditor v48 has no built-in allow-list, so we
 * intercept the `link` command before execution and stop invalid hrefs, with a
 * Notification warning (the old UI used window.alert).
 */

import { Plugin, Notification } from 'ckeditor5';

export function isAllowedHref(href: string): boolean {
  const h = href.trim();
  if (/^https:\/\//i.test(h)) return true;
  if (/^#\/(verse|section|day|acc)\//i.test(h)) return true;
  return false;
}

export class LinkPolicy extends Plugin {
  static get pluginName() {
    return 'LinkPolicy' as const;
  }

  init(): void {
    const linkCommand = this.editor.commands.get('link');
    if (!linkCommand) return;
    const notification = this.editor.plugins.get(Notification);

    linkCommand.on('execute', (evt, args) => {
      const href = String(args[0] ?? '');
      if (isAllowedHref(href)) return;
      evt.stop();
      notification.showWarning(
        'Only https:// or internal #/verse|section|day|acc links are allowed.',
        { title: 'Link blocked', namespace: 'link-policy' },
      );
    }, { priority: 'high' });
  }
}
