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
  onStartRecording: () => void;
  onStopRecording: () => void;
  /** e.g. "0:07" — shown while recording. */
  elapsed?: string;
};

/**
 * Ivory capsule with an orange mic. Text input is always available as the alternative to voice.
 * Start capture only from the mic tap (explicit user gesture) and always show the recording state + stop control.
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
}: ComposerProps) {
  const recording = state === 'recording';
  const busy = state === 'processing';
  const canSend = value.trim().length > 0 && !recording && !busy;

  return (
    <View style={styles.wrap}>
      <View style={styles.capsule}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop recording' : 'Start voice recording'}
          accessibilityState={{ busy }}
          disabled={busy || state === 'blocked'}
          onPress={recording ? onStopRecording : onStartRecording}
          style={[styles.mic, (busy || state === 'blocked') && styles.micDisabled]}>
          <Glyph name={recording ? 'check' : 'mic'} size={18} />
        </Pressable>

        {recording || busy ? (
          <View style={styles.status} accessibilityRole="text" accessibilityLiveRegion="polite">
            <SignalText variant="body" color="textSecondary">
              {recording ? `Listening… ${elapsed ?? ''}`.trim() : 'Preparing your message…'}
            </SignalText>
          </View>
        ) : (
          <TextInput
            accessibilityLabel="Describe the issue"
            placeholder={copy.inputHint}
            placeholderTextColor={palette.textMuted}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={canSend ? onSend : undefined}
            returnKeyType="send"
            multiline={false}
            style={styles.input}
          />
        )}

        {canSend ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={onSend} style={styles.send}>
            <Glyph name="arrow-right" size={20} color="accentInk" />
          </Pressable>
        ) : null}
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
    padding: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceGlassStrong,
    boxShadow: shadows.soft,
  },
  mic: {
    width: layout.micSize,
    height: layout.micSize,
    borderRadius: layout.micSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  micDisabled: { opacity: 0.5 },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
    color: palette.text,
    ...type.body,
  },
  status: { flex: 1, paddingHorizontal: 4 },
  send: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: layout.minTouch / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { paddingHorizontal: 16 },
});
