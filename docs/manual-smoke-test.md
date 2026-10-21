# Manual browser smoke-test checklist

Use this checklist for a disposable local or staging deployment after a release or UI change. It covers sign-in and session expiry, contact search and editing, narrow-screen dialogs, network failures, and passkey availability. It is a manual companion to the automated tests, not a security review.

## Safe test setup

- Use an isolated test deployment and a test account with a known password and at least one usable sign-in method. Enroll a passkey or configure a recovery code as needed. Do not use production accounts or production D1/R2 resources.
- Use fictional contact data only. Do not include real names, contact details, recovery codes, passwords, or secrets in notes, issue reports, or screenshots.
- Use a disposable contact for the search/edit checks and a separate fictional marker for the interrupted offline save; delete any created test contacts when finished.
- Record the app build or commit and the environment without including credentials or secret URLs.

## Run record

Complete one record for each browser/device combination. Record versions rather than assuming a browser supports a feature.

| Date | Build / commit | Environment (local or staging) | Device / OS and version | Browser and version | Viewport / orientation | Result |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

Suggested coverage for this project:

| Target | Device / OS version | Browser version | Result / notes |
| --- | --- | --- | --- |
| Android phone |  | Chrome |  |
| iPhone |  | Safari |  |
| Desktop |  | Chrome |  |
| Desktop |  | Firefox |  |
| Desktop |  | Edge |  |

Use **PASS**, **FAIL**, **BLOCKED**, or **N/A** for each check below. Add a short note for failures, blockers, or unsupported platform behavior. A passkey check marked N/A should say why (for example, the browser reports that WebAuthn is unavailable).

## Checklist

### Sign-in, sign-out, and session expiry

- [ ] Open the app while signed out. The sign-in screen and its passkey and recovery options are visible; no contact details are shown.
- [ ] Sign in to the test account using an enrolled passkey, or use its recovery flow if passkeys are unavailable in this browser. Complete any verification prompt. The app opens the contacts view and the test account's existing synthetic records are available.
- [ ] If a recovery code is configured for the test account, sign out and verify that the recovery flow accepts the test code and returns to the app. Do not record the code.
- [ ] Sign out from **Settings**. Reload the page or revisit it in the same browser profile. The app remains signed out until another successful sign-in.
- [ ] Sign in again, then leave the app untouched for the current 15-minute idle timeout. The app returns to the sign-in screen and displays the inactivity message. Sign in again and confirm the synthetic contact data is still present. Update this expected duration if the configured timeout changes.

### Contact search and editing

- [ ] Create one contact with a unique fictional marker (for example, `QA-SMOKE-2026-10-21`) and save it.
- [ ] Search for the exact marker. The matching test contact appears; a non-matching query shows no matching contact. Clear the search and confirm the contact list returns.
- [ ] Open the test contact, change a harmless field such as its notes to `QA edit v2`, and save. Reopen it and confirm the saved value is present.
- [ ] Delete the disposable contact and confirm it no longer appears in the regular contact list.

### Mobile keyboard and dialog layout

- [ ] On a narrow viewport, open the add-contact dialog and focus a field near the bottom of the form to show the on-screen keyboard.
- [ ] Confirm the focused field can be reached, the dialog content can scroll, and the cancel/save controls remain reachable without horizontal scrolling or content being trapped behind the keyboard or device safe area.
- [ ] Close the dialog with **Cancel** and reopen it. Confirm it opens and closes normally without leaving a blocked backdrop or preventing page scrolling.
- [ ] Repeat in portrait and landscape where the device supports rotation. Note viewport dimensions and any clipping or overlap.

### Network interruption and visible errors

- [ ] With the app open and a disposable contact form ready, switch the browser to offline mode (or enable airplane mode) and attempt to save a new fictional contact.
- [ ] Confirm the form stays open and displays an error instead of implying the save succeeded. Record the exact visible message without including personal data.
- [ ] Restore connectivity. Check the contact list before retrying; retry the save only if the record was not created. Confirm there is at most one copy of the test contact.

### Passkey availability notes

- [ ] For each browser/device combination, record whether the app reports passkeys as unavailable or opens the platform credential prompt. Do not infer support from another browser on the same device.
- [ ] If a test credential is already enrolled and the platform offers it, complete a sign-in once. If testing cancellation, cancel the prompt and confirm the app remains signed out and shows an error or cancellation message.
- [ ] Record the browser, OS, authenticator type (device or external, if known), and outcome. Mark unsupported combinations **N/A**; do not describe them as application failures unless the app gives an incorrect result.

## Reporting a failure

Include the run-record fields, the checklist item, concise reproduction steps, expected and actual results, and a redacted error message. Use synthetic data in screenshots and remove browser profile details, credentials, and personal information before sharing. Follow [SECURITY.md](../SECURITY.md) for suspected security issues instead of filing them publicly.
