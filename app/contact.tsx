import React, { useContext, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { router } from 'expo-router';

import PageWrapper from '@/components/PageWrapper';
import Text, { TextSizes } from '@/components/Text';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import { AuthContext } from '@/contexts/AuthContext';
import { sendContactMessage } from '@/services/contact';

// Same permissive shape-check the server uses — reject only what obviously
// isn't an address; a bounced reply is the real validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactScreen() {
  const theme = useTheme();
  const auth = useContext(AuthContext);
  const signedIn = !!auth?.isAuthenticated;
  const accountEmail = auth?.user?.email ?? '';

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Signed-in users can't edit their address (server uses the token email
  // regardless); guests type their own.
  const effectiveEmail = signedIn ? accountEmail : email;

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (message.trim().length === 0) return false;
    if (!signedIn && !EMAIL_RE.test(email.trim())) return false;
    return true;
  }, [submitting, message, signedIn, email]);

  const handleSubmit = async () => {
    setError(null);

    if (message.trim().length === 0) {
      setError('Please enter a message.');
      return;
    }
    if (!signedIn && !EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address so we can reply.');
      return;
    }

    setSubmitting(true);
    const result = await sendContactMessage({
      message: message.trim(),
      // Ignored server-side when signed in, but harmless to send.
      email: effectiveEmail.trim(),
    });
    setSubmitting(false);

    if (result.ok) {
      setSent(true);
    } else {
      setError(result.error);
    }
  };

  if (sent) {
    return (
      <PageWrapper>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
          <Text size={TextSizes.XL} bold style={{ textAlign: 'center' }}>
            Message sent
          </Text>
          <Text
            size={TextSizes.M}
            color={theme.colors.onSurfaceVariant}
            style={{ textAlign: 'center', marginTop: 12 }}
          >
            Thanks for reaching out — we&apos;ll get back to you at{' '}
            {effectiveEmail || 'your email'}.
          </Text>
          <View style={{ marginTop: 24, width: '100%' }}>
            <Button variant="primary" onPress={() => router.back()}>
              Done
            </Button>
          </View>
        </View>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text size={TextSizes.M} color={theme.colors.onSurfaceVariant}>
            Questions, feedback, or a bug to report? Send us a message and
            we&apos;ll reply by email.
          </Text>

          <View style={{ marginTop: 20 }}>
            <TextInput
              label="Your email"
              value={effectiveEmail}
              onChangeText={setEmail}
              editable={!signedIn}
              disabled={signedIn}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {signedIn && (
              <Text
                size={TextSizes.S}
                color={theme.colors.onSurfaceVariant}
                style={{ marginTop: 4 }}
              >
                We&apos;ll reply to your account email.
              </Text>
            )}
          </View>

          <View style={{ marginTop: 16 }}>
            <TextInput
              label="Message"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              maxLength={5000}
              style={{ minHeight: 140 }}
            />
          </View>

          {error && (
            <Text size={TextSizes.S} color={theme.colors.error} style={{ marginTop: 12 }}>
              {error}
            </Text>
          )}

          <View style={{ marginTop: 24 }}>
            <Button
              variant="primary"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={submitting}
            >
              {submitting ? 'Sending…' : 'Send message'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PageWrapper>
  );
}
