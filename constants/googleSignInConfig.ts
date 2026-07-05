/**
 * OAuth client IDs for native Google Sign-In (see LAUNCH_CHECKLIST.md §C for the
 * console steps to obtain them — both live in the molkky-scores-6ee0d
 * Google Cloud project and look like `653554845937-xxxx.apps.googleusercontent.com`).
 *
 * The Google sign-in button stays hidden until these are filled in, so the
 * app builds and runs fine with them empty.
 *
 * After setting GOOGLE_IOS_CLIENT_ID, also update the `iosUrlScheme` option
 * of the `@react-native-google-signin/google-signin` plugin in app.json (it's
 * the iOS client ID reversed: `com.googleusercontent.apps.653554845937-xxxx`)
 * and re-run `npx expo prebuild -p ios`.
 */

/** "Web client" ID — Firebase Console → Authentication → Google → Web SDK configuration. */
export const GOOGLE_WEB_CLIENT_ID =
  '653554845937-d2u2b12ugcg8sj5lujkdqjtp5bgn2v2o.apps.googleusercontent.com';

/** iOS OAuth client ID — created for bundle id com.connortyrrell.molkky. */
export const GOOGLE_IOS_CLIENT_ID =
  '653554845937-1ncnstkrhd72obk6eq3r35fj72d5rr7m.apps.googleusercontent.com';
