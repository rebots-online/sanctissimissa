/** Only authored messages cross into the product UI, in every build mode. */
export const companionFeedback = {
  checking: 'Checking what your device can use…',
  setup: 'Prepare the Sacristan once, then ask about the Mass, a feast, or a passage. The download needs an internet connection.',
  downloading: 'Downloading the Sacristan. You can return to the Missal while it prepares.',
  verifying: 'Checking the downloaded files…',
  starting: 'Starting the Sacristan. This may take a little while.',
  slow: 'This is taking longer than usual. You can keep waiting or return to the Missal.',
  ready: 'Your Sacristan is ready. What would you like to ask?',
  failed: 'The Sacristan could not finish preparing. Tap “Try again”, or choose another option below. You can still use the Missal.',
  catalogue: 'We could not check the Sacristan choices. Tap “Try again” to check once more. You can still use the Missal.',
  unavailable: 'The Sacristan cannot run on this device with this version of the app. You can continue using the Missal.',
  reply: 'The Sacristan could not finish its reply. Your question is below so you can try again.',
  stopped: 'Reply stopped. Your question is below if you would like to try again.',
  hostedKeyMissing: 'The hosted Sacristan is not configured on this build. On-device choices remain below; you can keep using the Missal.',
  hostedNetwork: 'The Sacristan could not reach the hosted service. Check the connection and try again — the Missal keeps working.',
  hostedLimited: 'The hosted service is limiting requests right now. Wait a moment and try again — the Missal keeps working.',
} as const;

export function logCompanionFailure(stage: string, error: unknown): void {
  console.error(`[Sacristan:${stage}]`, error);
}
