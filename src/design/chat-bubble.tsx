import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SignalText } from './signal-text';
import { palette, radius, shadows } from './tokens';

export type ChatBubbleProps = {
  from: 'assistant' | 'user';
  children: ReactNode;
  /** Assistant only: avatar shown to the left of the bubble (Pip). */
  leading?: ReactNode;
};

/**
 * Assistant = near-white card on the left (with Pip beside it). User = soft peach on the right. Max ~85% of the column.
 * Keep diagnostics in dedicated cards beneath the chat — never expose chain-of-thought or raw tool output.
 */
export function ChatBubble({ from, children, leading }: ChatBubbleProps) {
  const user = from === 'user';
  const bubble = (
    <View style={[styles.base, user ? styles.user : styles.assistant, !user && leading ? styles.withAvatar : null]}>
      {typeof children === 'string' ? <SignalText variant="body">{children}</SignalText> : children}
    </View>
  );
  if (user || !leading) return bubble;
  return (
    <View style={styles.row}>
      {leading}
      {bubble}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, maxWidth: '100%' },
  base: { maxWidth: '85%', paddingVertical: 11, paddingHorizontal: 15 },
  withAvatar: { flexShrink: 1, maxWidth: '82%' },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surfaceGlassStrong,
    borderWidth: 1,
    borderColor: palette.border,
    boxShadow: shadows.soft,
    borderTopLeftRadius: radius.bubbleTail,
    borderTopRightRadius: radius.bubble,
    borderBottomRightRadius: radius.bubble,
    borderBottomLeftRadius: radius.bubble,
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
