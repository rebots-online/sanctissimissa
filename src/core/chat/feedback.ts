/** Only authored messages cross into the product UI, in every build mode. */
export const companionFeedback = {
  checking: 'Checking what your device can use…',
  setup: 'Prepare the Companion once, then ask about the Mass, a feast, or a passage. The download needs an internet connection.',
  downloading: 'Downloading the Companion. You can return to the Missal while it prepares.',
  verifying: 'Checking the downloaded files…',
  starting: 'Starting the Companion. This may take a little while.',
  slow: 'This is taking longer than usual. You can keep waiting or return to the Missal.',
  ready: 'Your Companion is ready. What would you like to ask?',
  failed: 'The Companion could not finish preparing. Tap “Try again”, or choose another option below. You can still use the Missal.',
  catalogue: 'We could not check the Companion choices. Tap “Try again” to check once more. You can still use the Missal.',
  unavailable: 'The Companion cannot run on this device with this version of the app. You can continue using the Missal.',
  reply: 'The Companion could not finish its reply. Your question is below so you can try again.',
  stopped: 'Reply stopped. Your question is below if you would like to try again.',
} as const;

export function logCompanionFailure(stage: string, error: unknown): void {
  console.error(`[Companion:${stage}]`, error);
}
