import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Glyph } from './glyph';
import { SignalText } from './signal-text';
import { copy, layout, palette, radius, shadows, type } from './tokens';

export type ComposerState = 'idle' | 'recording' | 'processing' | 'blocked' | 'ready';

export type ComposerProps = {
  state?: ComposerState;
  value: string;
  onChangeText: (text: string) => void;
  /** Required: a composer that cannot submit must not ship. */
  onSend: () => void;
  /** Voice is optional: omit both recording handlers to render a text-only composer (no mic). */
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  /** e.g. "0:07" — shown while recording. */
  elapsed?: string;
  /** Overrides the default "Tell me what’s wrong" hint. */
  placeholder?: string;
  /** Blocks sending (e.g. a request is in flight) without hiding the typed text. */
  disabled?: boolean;
};

/**
 * Ivory capsule with one orange circle: the mic when voice is wired, otherwise the send button.
 * Text input is always available as the alternative to voice. Start capture only from the mic tap
 * (explicit user gesture) and always show the recording state + stop control.
 * Do not animate an idle waveform as though audio were being captured.
 */
export function Composer({
  state = 'idle',
  value,
  onChangeText,
  onSend,
  onStartRecording,
  onStopRecording,
  elapsed,
  placeholder = copy.inputHint,
  disabled,
}: ComposerProps) {
  const recording = state === 'recording';
  const busy = state === 'processing';
  const hasVoice = !!(onStartRecording && onStopRecording);
  const canSend = value.trim().length > 0 && !recording && !busy && !disabled;

  return (
    <View style={styles.wrap}>
      <View style={[styles.capsule, !hasVoice && styles.capsuleText]}>
        {hasVoice ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recording ? 'Stop recording' : 'Start voice recording'}
            accessibilityState={{ busy }}
            disabled={busy || state === 'blocked'}
            onPress={recording ? onStopRecording : onStartRecording}
            style={({ pressed }) => [styles.circle, styles.mic, pressed && styles.circlePressed, (busy || state === 'blocked') && styles.micDisabled]}>
            <Glyph name={recording ? 'check' : 'mic'} size={22} color="onAccent" />
          </Pressable>
        ) : null}

        {recording || busy ? (
          <View style={styles.status} accessibilityRole="text" accessibilityLiveRegion="polite">
            <SignalText variant="body" color="textSecondary">
              {recording ? `Listening… ${elapsed ?? ''}`.trim() : 'Preparing your message…'}
            </SignalText>
          </View>
        ) : (
          <TextInput
            accessibilityLabel="Describe the issue"
            placeholder={placeholder}
            placeholderTextColor={palette.textMuted}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={canSend ? onSend : undefined}
            returnKeyType="send"
            multiline={false}
            style={styles.input}
          />
        )}

        {hasVoice ? (
          canSend ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={onSend} style={styles.ghost}>
              <Glyph name="arrow-right" size={22} color="accentInk" />
            </Pressable>
          ) : null
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={onSend}
            style={({ pressed }) => [styles.circle, styles.send, !canSend && styles.sendIdle, pressed && styles.circlePressed]}>
            <Glyph name="arrow-up" size={22} color={canSend ? 'onAccent' : 'textDisabled'} />
          </Pressable>
        )}
      </View>
      {state === 'blocked' ? (
        <SignalText variant="meta" style={styles.hint} accessibilityLiveRegion="polite">
          {copy.micBlocked}
        </SignalText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  capsule: {
    minHeight: layout.composerHeight,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceGlassStrong,
    boxShadow: shadows.floating,
  },
  capsuleText: { paddingLeft: 8 },
  circle: {
    width: layout.micSize,
    height: layout.micSize,
    borderRadius: layout.micSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
    boxShadow: shadows.primary,
  },
  mic: { width: layout.micSize + 4, height: layout.micSize + 4, borderRadius: (layout.micSize + 4) / 2 },
  circlePressed: { backgroundColor: palette.accentPressed, boxShadow: shadows.primaryPressed },
  micDisabled: { opacity: 0.5 },
  send: {},
  sendIdle: { backgroundColor: palette.surfaceSunken, boxShadow: '0 0 0 rgba(0,0,0,0)' },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
    color: palette.text,
    ...type.body,
  },
  status: { flex: 1, paddingHorizontal: 6 },
  ghost: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: layout.minTouch / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { paddingHorizontal: 16 },
});
