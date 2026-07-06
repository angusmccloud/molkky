// Public-facing support/contact and privacy-policy links. The privacy policy
// must stay reachable from inside the app regardless of auth state (store
// requirement).
//
// SUPPORT_URL is no longer linked from inside the app — the in-app Contact Us
// form (app/contact.tsx → sendContactMessage Cloud Function) now covers
// Apple's "contact info must be discoverable" expectation. Kept because App
// Store Connect still requires a Support URL field, and this is that page.
export const SUPPORT_URL = 'https://connortyrrell.com/contact-me/';
export const PRIVACY_POLICY_URL = 'https://connortyrrell.com/privacy-policy-mobile-apps/';
