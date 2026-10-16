import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SignalText } from './signal-text';
import { palette, radius, shadows } from './tokens';

export type ChatBubbleProps = {
  from: 'assistant' | 'user';
  children: ReactNode;
};

/**
 * Assistant = warm glass, left. User = muted taupe, right. Max ~85% of the column.
 * Keep diagnostics in dedicated cards beneath the chat — never expose chain-of-thought or raw tool output.
 */
export function ChatBubble({ from, children }: ChatBubbleProps) {
  const user = from === 'user';
  return (
    <View style={[styles.base, user ? styles.user : styles.assistant]}>
      {typeof children === 'string' ? <SignalText variant="body">{children}</SignalText> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { maxWidth: '85%', paddingVertical: 12, paddingHorizontal: 16 },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surfaceGlass,
    borderWidth: 1,
    borderColor: palette.border,
    boxShadow: shadows.soft,
    borderTopLeftRadius: radius.bubble,
    borderTopRightRadius: radius.bubble,
    borderBottomRightRadius: radius.bubble,
    borderBottomLeftRadius: radius.bubbleTail,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: palette.surfaceUser,
    borderTopLeftRadius: radius.bubble,
    borderTopRightRadius: radius.bubble,
    borderBottomLeftRadius: radius.bubble,
    borderBottomRightRadius: radius.bubbleTail,
  },
});
