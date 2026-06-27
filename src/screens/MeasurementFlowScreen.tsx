import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { RootStackParamList } from '../../App';
import { startSensor, stopSensor, captureSamples } from '../utils/sensorUtils';
import {
  averageOrientations,
  WheelOrientation,
  computeFullAlignment,
  AlignmentResults,
} from '../utils/alignmentMath';
import { COLORS, FONTS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MeasurementFlow'>;
  route: RouteProp<RootStackParamList, 'MeasurementFlow'>;
};

type StepId =
  | 'rl_camber_toe'
  | 'rr_camber_toe'
  | 'fl_camber_toe'
  | 'fr_camber_toe'
  | 'fl_caster_left'
  | 'fl_caster_right'
  | 'fr_caster_left'
  | 'fr_caster_right';

interface Step {
  id: StepId;
  title: string;
  subtitle: string;
  instructions: string[];
  jigPosition: string; // emoji representation
  casterNote?: string;
}

const STEPS: Step[] = [
  {
    id: 'rl_camber_toe',
    title: 'Rear Left Wheel',
    subtitle: 'Camber & Toe Reference',
    jigPosition: '🚗\n↖ HERE',
    instructions: [
      'Clamp the jig firmly to the rear LEFT wheel rim.',
      'Place your phone in the jig tray, screen facing OUTWARD (away from truck).',
      'Hold the jig steady against the wheel — do not press on the tire sidewall.',
      'Tap CAPTURE when stable.',
    ],
  },
  {
    id: 'rr_camber_toe',
    title: 'Rear Right Wheel',
    subtitle: 'Camber & Toe Reference',
    jigPosition: '🚗\n↗ HERE',
    instructions: [
      'Move to the rear RIGHT wheel.',
      'Clamp the jig firmly to the rear right wheel rim.',
      'Phone in tray, screen facing OUTWARD.',
      'Hold steady, then tap CAPTURE.',
    ],
  },
  {
    id: 'fl_camber_toe',
    title: 'Front Left Wheel',
    subtitle: 'Camber & Toe',
    jigPosition: '🚗\n↙ HERE',
    instructions: [
      'Steering wheel must be CENTERED (straight ahead).',
      'Clamp the jig to the front LEFT wheel.',
      'Phone in tray, screen facing OUTWARD.',
      'Hold steady, tap CAPTURE.',
    ],
  },
  {
    id: 'fr_camber_toe',
    title: 'Front Right Wheel',
    subtitle: 'Camber & Toe',
    jigPosition: '🚗\n↘ HERE',
    instructions: [
      'Keep steering wheel CENTERED.',
      'Move to front RIGHT wheel.',
      'Phone in tray, screen facing OUTWARD.',
      'Hold steady, tap CAPTURE.',
    ],
  },
  {
    id: 'fl_caster_left',
    title: 'Front Left — Caster Step 1',
    subtitle: 'Steer to LEFT lock',
    jigPosition: '↩️ STEER LEFT',
    casterNote: 'Caster requires 2 readings per wheel at opposite steering locks.',
    instructions: [
      'Have your helper hold the jig on the front LEFT wheel.',
      'Slowly turn the steering wheel to FULL LEFT LOCK and hold.',
      'Hold the jig firmly against the wheel face.',
      'Tap CAPTURE when stable.',
    ],
  },
  {
    id: 'fl_caster_right',
    title: 'Front Left — Caster Step 2',
    subtitle: 'Steer to RIGHT lock',
    jigPosition: '↪️ STEER RIGHT',
    instructions: [
      'Jig stays on front LEFT wheel.',
      'Now turn the steering wheel to FULL RIGHT LOCK and hold.',
      'Hold the jig firmly — same position on the wheel.',
      'Tap CAPTURE when stable.',
    ],
  },
  {
    id: 'fr_caster_left',
    title: 'Front Right — Caster Step 1',
    subtitle: 'Steer to LEFT lock',
    jigPosition: '↩️ STEER LEFT',
    instructions: [
      'Move jig to front RIGHT wheel.',
      'Turn the steering wheel to FULL LEFT LOCK and hold.',
      'Hold the jig firmly against the wheel face.',
      'Tap CAPTURE when stable.',
    ],
  },
  {
    id: 'fr_caster_right',
    title: 'Front Right — Caster Step 2',
    subtitle: 'Steer to RIGHT lock',
    jigPosition: '↪️ STEER RIGHT',
    instructions: [
      'Jig stays on front RIGHT wheel.',
      'Turn to FULL RIGHT LOCK and hold.',
      'Hold jig firmly.',
      'Tap CAPTURE when stable.',
    ],
  },
];

interface CapturedData {
  rl?: WheelOrientation;
  rr?: WheelOrientation;
  fl?: WheelOrientation;
  fr?: WheelOrientation;
  flCasterLeft?: WheelOrientation;
  flCasterRight?: WheelOrientation;
  frCasterLeft?: WheelOrientation;
  frCasterRight?: WheelOrientation;
}

export default function MeasurementFlowScreen({ navigation, route }: Props) {
  const { vehicleProfile, baseline } = route.params;
  const [stepIndex, setStepIndex] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [captured, setCaptured] = useState<CapturedData>({});
  const progressAnim = useRef(new Animated.Value(0)).current;

  const step = STEPS[stepIndex];
  const totalSteps = STEPS.length;

  useEffect(() => {
    activateKeepAwakeAsync();
    startSensor();
    return () => {
      deactivateKeepAwake();
      stopSensor();
    };
  }, []);

  async function handleCapture() {
    setCapturing(true);
    setProgress(0);
    progressAnim.setValue(0);

    try {
      const result = await captureSamples((p) => {
        setProgress(p);
        Animated.timing(progressAnim, {
          toValue: p,
          duration: 80,
          useNativeDriver: false,
        }).start();
      });

      const measurement = averageOrientations(result.samples);

      const newCaptured = { ...captured };
      switch (step.id) {
        case 'rl_camber_toe': newCaptured.rl = measurement.orientation; break;
        case 'rr_camber_toe': newCaptured.rr = measurement.orientation; break;
        case 'fl_camber_toe': newCaptured.fl = measurement.orientation; break;
        case 'fr_camber_toe': newCaptured.fr = measurement.orientation; break;
        case 'fl_caster_left': newCaptured.flCasterLeft = measurement.orientation; break;
        case 'fl_caster_right': newCaptured.flCasterRight = measurement.orientation; break;
        case 'fr_caster_left': newCaptured.frCasterLeft = measurement.orientation; break;
        case 'fr_caster_right': newCaptured.frCasterRight = measurement.orientation; break;
      }

      setCaptured(newCaptured);
      setCapturing(false);

      if (stepIndex === totalSteps - 1) {
        finalize(newCaptured);
      } else {
        setStepIndex(stepIndex + 1);
      }
    } catch (e: any) {
      setCapturing(false);
      Alert.alert('Capture Failed', e.message);
    }
  }

  function finalize(data: CapturedData) {
    if (!data.rl || !data.rr || !data.fl || !data.fr) {
      Alert.alert('Missing Data', 'Some measurements are missing. Please retake.');
      return;
    }

    const results: AlignmentResults = computeFullAlignment(
      data.rl,
      data.rr,
      data.fl,
      data.fr,
      baseline,
      data.flCasterLeft,
      data.flCasterRight,
      data.frCasterLeft,
      data.frCasterRight,
    );

    navigation.navigate('Results', { results, vehicleProfile });
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressHeader}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((stepIndex) / totalSteps) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {stepIndex + 1} / {totalSteps}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.stepIndicator}>
          {step.casterNote && (
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>ℹ️  {step.casterNote}</Text>
            </View>
          )}
        </View>

        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepSubtitle}>{step.subtitle}</Text>

        <View style={styles.jigCard}>
          <Text style={styles.jigText}>{step.jigPosition}</Text>
        </View>

        <View style={styles.instructionsCard}>
          {step.instructions.map((inst, i) => (
            <View key={i} style={styles.instRow}>
              <View style={styles.instNum}>
                <Text style={styles.instNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.instText}>{inst}</Text>
            </View>
          ))}
        </View>

        {capturing && (
          <View style={styles.captureCard}>
            <Text style={styles.captureLabel}>
              Sampling… {Math.round(progress * 100)}%
            </Text>
            <View style={styles.captureTrack}>
              <Animated.View style={[styles.captureFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.captureHint}>Hold the jig steady!</Text>
          </View>
        )}

        <View style={styles.btnRow}>
          {!capturing && (
            <>
              <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                <Text style={styles.captureBtnText}>
                  {stepIndex === totalSteps - 1 ? '⬡  CAPTURE & FINISH' : '⬡  CAPTURE'}
                </Text>
              </TouchableOpacity>

              {stepIndex > 0 && (
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStepIndex(stepIndex - 1)}
                >
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <Text style={styles.tipText}>
          💡 Tip: For accurate readings, make sure the jig is pressed flat against the wheel face — not the tire.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  progressTrack: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 3 },
  progressText: { color: COLORS.textDim, fontSize: 12, fontFamily: FONTS.mono, minWidth: 40 },
  scroll: { padding: 20, gap: 16 },
  stepIndicator: { gap: 8 },
  noteCard: {
    backgroundColor: COLORS.infoBg,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  noteText: { color: COLORS.info, fontSize: 13, lineHeight: 18 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  stepSubtitle: { fontSize: 14, color: COLORS.accent, fontFamily: FONTS.mono },
  jigCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  jigText: { fontSize: 28, textAlign: 'center', lineHeight: 40 },
  instructionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  instRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  instNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  instNumText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  instText: { flex: 1, color: COLORS.text, fontSize: 14, lineHeight: 21 },
  captureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  captureLabel: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  captureTrack: { width: '100%', height: 10, backgroundColor: COLORS.border, borderRadius: 5, overflow: 'hidden' },
  captureFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 5 },
  captureHint: { color: COLORS.textDim, fontSize: 13, fontStyle: 'italic' },
  btnRow: { gap: 12 },
  captureBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  captureBtnText: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 1 },
  backBtn: { padding: 14, alignItems: 'center' },
  backBtnText: { color: COLORS.textDim, fontSize: 14 },
  tipText: { color: COLORS.textDim, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
});
