# Google Play app-content worksheet — evidence-based draft

This worksheet reflects the v1.16.34594 production source and package. Recheck it if
analytics, crash reporting, cloud sync, accounts, ads, payments, or remote APIs are
added before submission.

## Data safety

- Does the app collect or share user data off the device? **No, based on this release.**
- Analytics or telemetry SDK: **None observed.**
- Advertising SDK or ads: **None observed; declare “No ads.”**
- Account, authentication, or cloud-sync service: **None observed.**
- Remote application API: **None observed.** The corpus load is a same-package fetch of
  `/missal.db`, and the production Tauri CSP permits only self/IPC connections.
- User-created journal, annotation, study, and homily content: **Stored locally on the
  device** in IndexedDB/localStorage; it is not transmitted by this release.
- Data deletion: users can remove local content through app/OS storage controls. There
  is no server-side account or retained server record to delete in this release.
- Encryption in transit: **Not applicable to user data**, because the release does not
  transmit user data.

## Other Play declarations

- App access: **All functionality is available without login or reviewer credentials.**
- Target audience: recommended **13 and older; not primarily directed to children**.
- Content rating: complete the IARC questionnaire as an educational/religious reference.
- News app: **No.**
- Government app: **No.**
- Financial features: **None.**
- Health features: **None.**

## Privacy-policy substance

The public policy should say that this release stores journal, annotation, preference,
and homily-planning content locally; does not operate accounts, advertising, analytics,
or cloud sync; and does not transmit that content to the developer. It should explain
that uninstalling or clearing application storage removes local data, subject to any
device backups controlled by the operating system.

Google Play still requires an active public privacy-policy URL even for apps that do
not collect personal or sensitive data. Publish the final policy at the product website
and use that URL in Play Console and Microsoft Partner Center.
