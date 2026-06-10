import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Module-level error reporter. Right now this is a console-only stub.
 *
 * IMPORTANT: This is the single place to wire up a crash reporter so that
 * render-phase crashes generate telemetry instead of silently white-screening
 * the app. Hook in Sentry (`@sentry/react-native`) or Expo's recommended
 * crash-reporting option HERE — e.g. `Sentry.captureException(error, { extra: info })`.
 * It is intentionally left as a no-op-plus-console stub so this change does not
 * pull in any external dependency; adding the SDK is a deliberate follow-up.
 */
export function reportError(error: Error, info: React.ErrorInfo) {
  console.error('[ErrorBoundary] Uncaught render error:', error, info?.componentStack);
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Root error boundary. React only lets class components catch render errors,
 * so this is intentionally a class (no hooks equivalent exists).
 *
 * The fallback deliberately uses plain react-native View/Text/Pressable and
 * hard-coded styles rather than the app's themed primitives (Text, Button,
 * PaperProvider/useTheme): if the crash originates in the theme, fonts, or a
 * shared component, depending on those here could make the boundary itself
 * throw and re-white-screen the app. Plain primitives are the safest fallback.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    // Flip into the fallback UI on the next render.
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Side-effect only: forward to the reporter stub for telemetry.
    reportError(error, info);
  }

  // Clears the error so children re-mount; useful when the failure was transient.
  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app hit an unexpected error. You can try again — if it keeps
            happening, restarting the app usually helps.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={this.handleReset}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#444444',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 100,
    backgroundColor: '#1f6feb',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ErrorBoundary;
