import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { app } from '@/lib/firebase';

/**
 * Client side of the in-app Contact Us form.
 *
 * Calls the `sendContactMessage` Cloud Function (functions/src/index.ts), which
 * emails the message to the app owner via Resend. Auth is optional: when the
 * user is signed in the function ignores any client-supplied email and uses the
 * verified token email instead, so we only bother sending `email` for guests.
 */

// Lazy init so importing this module has no side effects (mirrors
// services/purchaseValidation.ts).
let functionsInstance: Functions | null = null;

const getFunctionsInstance = (): Functions => {
  if (!functionsInstance) {
    // Region must match the function's `region` option.
    functionsInstance = getFunctions(app, 'us-central1');
  }
  return functionsInstance;
};

export interface SendContactMessageInput {
  message: string;
  /** Only used by the server for guests; ignored when the caller is signed in. */
  email?: string;
}

export type SendContactResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Ask the server to email a contact message to the app owner. Never throws:
 * returns a discriminated result the form can render directly.
 */
export const sendContactMessage = async ({
  message,
  email,
}: SendContactMessageInput): Promise<SendContactResult> => {
  try {
    const callable = httpsCallable(getFunctionsInstance(), 'sendContactMessage');
    await callable({ message, email });
    return { ok: true };
  } catch (e: any) {
    // FirebaseError codes look like 'functions/invalid-argument' (bad message /
    // email), 'functions/internal' (Resend failed), or 'functions/unavailable'
    // (offline / not deployed). Surface the server message when present.
    const code: string = e?.code ?? '';
    const serverMessage: string | undefined = e?.message;
    console.log('[contact] sendContactMessage failed', code || e);

    if (code === 'functions/invalid-argument' && serverMessage) {
      return { ok: false, error: serverMessage };
    }
    if (code === 'functions/unavailable') {
      return {
        ok: false,
        error: "Couldn't reach the server. Check your connection and try again.",
      };
    }
    return {
      ok: false,
      error: 'Something went wrong sending your message. Please try again.',
    };
  }
};
