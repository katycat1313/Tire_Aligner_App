import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { RootStackParamList } from '../../App';
import {
  startSensor,
  stopSensor,
  captureSamples,
  subscribeToLiveOrientation,
  checkSensorAvailability,
} from '../utils/sensorUtils';
import { averageOrientations, WheelOrientation } from '../utils/alignmentMath';
import { COLORS, FONTS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Calibration'>;
  route: RouteProp<RootStackParamList, 'Calibration'>;
};

export default function CalibrationScreen({ navigation, route }: Props) {
  const { vehicleProfile } = route.params;
  const [phase, setPhase] = useState<'instructions' | 'live' | 'capturing' | 'done'>('instructions');
  const [liveOrientation, setLiveOrientation] = useState<WheelOrientation | null>(null);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [baseline, setBaseline] = useState<WheelOrientation | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
      stopSensor();
    };
  }, []);

  async function startLivePreview() {
    const available = await checkSensorAvailability();
    if (!available) {
      Alert.alert(
        'Sensor Unavailable',
        'DeviceMotion is not available on this device. Make sure motion permissions are granted in Settings.',
      );
      return;
    }
    startSensor();
    setPhase('live');
    const sub = subscribeToLiveOrientation((o) => setLiveOrientation(o));
    return () => sub.remove();
  }

  async function captureBaseline() {
    setPhase('capturing');
    stopSensor();
    startSensor();

    try {
      const result = await captureSamples((p) => {
        setCaptureProgress(p);
        Animated.timing(progressAnim, {
          toValue: p,
          duration: 80,
          useNativeDriver: false,
        }).start();
      });

      const averaged = averageOrientations(result.samples);
      setBaseline(averaged.orientation);
      setPhase('done');
    } catch (e: any) {
      Alert.alert('Capture Failed', e.message);
      setPhase('live');
    }
  }

  function proceed() {
    if (!baseline) return;
    navigation.navigate('MeasurementFlow', {
      vehicleProfile,
      baseline,
    });
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {phase === 'instructions' && (
        <View style={styles.content}>
          <Text style={styles.heading}>Surface Calibration</Text>
          <Text style={styles.body}>
            This step measures your surface slope so the app can subtract it from every wheel reading — giving you accurate angles even if your driveway isn't perfectly level.
          </Text>

          <View style={styles.stepsCard}>
            {[
              "Park your truck on the surface you'll use for the full alignment.",
              'Place your 3D-printed jig on the flat ground next to the vehicle.',
              'Set your phone into the jig tray, screen facing up.',
              'Hold it perfectly still, then tap Capture Baseline.',
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Do not move the vehicle between calibration and measurement. Retake calibration if the truck moves.
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={startLivePreview}>
            <Text style={styles.primaryBtnText}>BEGIN CALIBRATION</Text>
          </TouchableOpacity>
        </View>
      )}

      {(phase === 'live' || phase === 'capturing') && (
        <View style={styles.content}>
          <Text style={styles.heading}>
            {phase === 'live' ? 'Hold Steady on Ground' : 'Capturing…'}
          </Text>

          {liveOrientation && phase === 'live' && (
            <View style={styles.liveCard}>
              <Text style={styles.liveTitle}>LIVE SENSOR READING</Text>
              <AngleRow label="Roll (γ)" value={liveOrientation.gamma} />
              <AngleRow label="Pitch (β)" value={liveOrientation.beta} />
              <AngleRow label="Heading (α)" value={liveOrientation.alpha} />
              <Text style={styles.liveHint}>
                Wait for values to settle, then tap Capture.
              </Text>
            </View>
          )}

          {phase === 'capturing' && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>
                Collecting samples… {Math.round(captureProgress * 100)}%
              </Text>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            </View>
          )}

          {phase === 'live' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={captureBaseline}>
              <Text style={styles.primaryBtnText}>CAPTURE BASELINE</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {phase === 'done' && baseline && (
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✓</Text>
          </View>
          <Text style={styles.heading}>Calibration Complete</Text>
          <Text style={styles.body}>
            Baseline captured. All wheel measurements will be corrected for this surface angle.
          </Text>

          <View style={styles.liveCard}>
            <Text style={styles.liveTitle}>BASELINE VALUES (subtracted from all readings)</Text>
            <AngleRow label="Roll (γ)" value={baseline.gamma} />
            <AngleRow label="Pitch (β)" value={baseline.beta} />
            <AngleRow label="Heading (α)" value={baseline.alpha} />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={proceed}>
            <Text style={styles.primaryBtnText}>START MEASURING WHEELS →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('instructions')}>
            <Text style={styles.secondaryBtnText}>Redo Calibration</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function AngleRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.angleRow}>
      <Text style={styles.angleLabel}>{label}</Text>
      <Text style={styles.angleValue}>{value.toFixed(3)}°</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 24, gap: 20, justifyContent: 'center' },
  heading: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  body: { fontSize: 15, color: COLORS.textDim, lineHeight: 22 },
  stepsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stepText: { flex: 1, color: COLORS.text, fontSize: 14, lineHeight: 20 },
  warningCard: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  warningText: { color: COLORS.warning, fontSize: 13, lineHeight: 18 },
  liveCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  liveTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textDim, letterSpacing: 1.5 },
  angleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  angleLabel: { color: COLORS.textDim, fontSize: 14 },
  angleValue: { color: COLORS.text, fontSize: 16, fontFamily: FONTS.mono, fontWeight: '700' },
  liveHint: { color: COLORS.textDim, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  progressContainer: { gap: 12 },
  progressLabel: { color: COLORS.text, fontSize: 16, textAlign: 'center' },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 4 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.goodBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  successEmoji: { fontSize: 36, color: COLORS.good },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1.2 },
  secondaryBtn: { padding: 14, alignItems: 'center' },
  secondaryBtnText: { color: COLORS.textDim, fontSize: 14 },
});
