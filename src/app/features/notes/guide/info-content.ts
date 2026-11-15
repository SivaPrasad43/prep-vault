/**
 * Built-in read-only pages linked from the notes-list footer (Support, Privacy, Terms).
 * Shipped with the app like the guide: edit this file and deploy to update them.
 */
export const CONTACT_EMAIL = 'sivaprasad.cd1@gmail.com';
const LAST_UPDATED = '15 November 2026';

export const SUPPORT_TITLE = 'Support';
export const SUPPORT_MARKDOWN = `Need help with PrepDay, found a bug, or have an idea? We'd love to hear from you.

## Contact us

Email **[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})** and we'll get back to you as soon as we can, usually within a couple of days.

To help us sort things out quickly, please include:

- what you were trying to do
- what happened instead
- your browser and device (for example, Chrome on Windows or Safari on iPhone)
- a screenshot, if you can

## Quick answers

**How do I sign in?** PrepDay uses your Google account. Click **Continue with Google** on the sign-in page.

**Do I need to save my notes?** No. Notes save automatically a moment after you stop typing. You can also press **Ctrl/Cmd + S** to save right away.

**Where did an empty note go?** If you clear a note's title and text completely and leave it, PrepDay deletes it so blank notes don't pile up.

**How do I delete a note?** Open it, click the **⋯** menu in the top bar, then **Delete note**.

**How do I delete my account and data?** Email us from the Google address you sign in with and we'll delete your account and all your notes.

New to PrepDay? Read the built-in guide at the top of your notes list.
`;

export const PRIVACY_TITLE = 'Privacy Policy';
export const PRIVACY_MARKDOWN = `_Last updated: ${LAST_UPDATED}_

PrepDay is a personal note-taking app for interview preparation. This policy explains what information we collect, why, and the choices you have.

## What we collect

- **Account details from Google.** When you sign in with Google we receive your name, email address and profile picture. We use them only to create your account and show who's signed in.
- **Your content.** The notes you write (titles, text, code, highlights), the categories and confidence levels you choose, bookmarks, and when you mark notes as revised.
- **Settings in your browser.** Your light/dark theme, last-used category and sign-in session are kept in your browser's local storage on your device.

We don't use advertising, tracking pixels or third-party analytics, and we don't sell your data.

## How we use it

Only to run PrepDay for you: to save and show your notes, calculate your streak and progress, and keep you signed in. Your notes are private to your account. Other users can't see them.

## Where it's stored

- **Supabase** stores your account and notes in a hosted database, with access rules that limit every account to its own data.
- **Vercel** hosts the app.
- **Google** handles sign-in and serves the app's fonts.

These providers process data on our behalf under their own security and privacy terms.

## Keeping it safe

Data is sent over encrypted connections (HTTPS), and each account can only read its own notes. No service is perfectly secure, so please don't store passwords, financial details or other highly sensitive information in your notes.

## Your choices

- You can edit or delete any note at any time.
- To export your notes, or to delete your account and all its data, email **[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})** from the address you sign in with.
- You can clear the settings stored in your browser by clearing site data.

## Children

PrepDay isn't intended for children under 13, and we don't knowingly collect their information.

## Changes

If we change this policy we'll update the date above. Significant changes will also be mentioned in the app.

## Contact

Questions about privacy? Email **[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})**.
`;

export const TERMS_TITLE = 'Terms of Service';
export const TERMS_MARKDOWN = `_Last updated: ${LAST_UPDATED}_

By using PrepDay you agree to these terms. If you don't agree, please don't use the app.

## Your account

You sign in with your Google account and are responsible for activity under it. Keep your Google account secure, and tell us if you think someone else has accessed your PrepDay account.

## Your content

Your notes are yours. You keep all rights to what you write. You give us permission to store and display your content only so that we can run PrepDay for you.

Please don't use PrepDay to store or share content that is illegal, infringes someone else's rights, or contains malware.

## Acceptable use

Don't try to:

- access other people's accounts or data
- disrupt, overload or reverse-engineer the service
- use automated tools to scrape or abuse PrepDay

We may suspend accounts that break these rules.

## The service

PrepDay is provided **"as is"**, without warranties of any kind. We work to keep it available and your notes safe, but we can't guarantee the service will be uninterrupted or error-free. Keep your own copies of anything critical.

We may change, add or remove features. If we ever shut PrepDay down, we'll give reasonable notice so you can export your notes.

## Liability

To the extent the law allows, PrepDay and its maker aren't liable for indirect or consequential losses, or for loss of data, arising from your use of the app.

## Ending your use

You can stop using PrepDay at any time and ask us to delete your account. We may end access for accounts that seriously or repeatedly break these terms.

## Changes to these terms

We may update these terms. We'll change the date above, and continuing to use PrepDay afterwards means you accept the new terms.

## Contact

Questions about these terms? Email **[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})**.
`;
