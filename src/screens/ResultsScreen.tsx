import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { AlignmentResults, WheelAlignmentData } from '../utils/alignmentMath';
import { VehicleProfile } from '../constants/vehicleSpecs';
import { COLORS, FONTS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Results'>;
  route: RouteProp<RootStackParamList, 'Results'>;
};

type WheelKey = 'frontLeft' | 'frontRight' | 'rearLeft' | 'rearRight';

const WHEEL_LABELS: Record<WheelKey, string> = {
  frontLeft: 'Front Left',
  frontRight: 'Front Right',
  rearLeft: 'Rear Left',
  rearRight: 'Rear Right',
};

export default function ResultsScreen({ navigation, route }: Props) {
  const { results, vehicleProfile } = route.params;
  const specs = vehicleProfile.specs;

  const allWheels: WheelKey[] = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight'];

  function getStatus(value: number, target: number, tolerance: number): 'good' | 'warning' | 'bad' {
    const diff = Math.abs(value - target);
    if (diff <= tolerance) return 'good';
    if (diff <= tolerance * 1.75) return 'warning';
    return 'bad';
  }

  function overallStatus(): 'good' | 'warning' | 'bad' {
    const statuses: string[] = [];
    for (const key of allWheels) {
      const data = results[key];
      const isFront = key.includes('front');
      const toeSpec = isFront ? specs.frontToePerWheel : specs.rearToePerWheel;
      const camberSpec = isFront ? specs.frontCamber : specs.rearCamber;
      statuses.push(getStatus(data.toe, toeSpec.target, toeSpec.tolerance));
      statuses.push(getStatus(data.camber, camberSpec.target, camberSpec.tolerance));
      if (data.caster != null) {
        statuses.push(getStatus(data.caster, specs.frontCaster.target, specs.frontCaster.tolerance));
      }
    }
    if (statuses.includes('bad')) return 'bad';
    if (statuses.includes('warning')) return 'warning';
    return 'good';
  }

  const overall = overallStatus();
  const overallConfig = {
    good: { color: COLORS.good, bg: COLORS.goodBg, emoji: '✓', label: 'IN SPEC' },
    warning: { color: COLORS.warning, bg: COLORS.warningBg, emoji: '!', label: 'CLOSE TO LIMIT' },
    bad: { color: COLORS.bad, bg: COLORS.badBg, emoji: '✕', label: 'NEEDS ADJUSTMENT' },
  }[overall];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Alignment Results</Text>
        <Text style={styles.subheading}>{specs.name}</Text>

        {/* Overall status banner */}
        <View style={[styles.statusBanner, { backgroundColor: overallConfig.bg }]}>
          <Text style={[styles.statusEmoji, { color: overallConfig.color }]}>{overallConfig.emoji}</Text>
          <View>
            <Text style={[styles.statusLabel, { color: overallConfig.color }]}>{overallConfig.label}</Text>
          </View>
        </View>

        {/* Thrust Angle Card */}
        <ThrustAngleCard thrustAngle={results.thrustAngle} />

        {allWheels.map((key) => {
          const data = results[key];
          const isFront = key.includes('front');
          const isLeft = key.includes('Left');
          const toeSpec = isFront ? specs.frontToePerWheel : specs.rearToePerWheel;
          const camberSpec = isFront ? specs.frontCamber : specs.rearCamber;

          const toeStatus = getStatus(data.toe, toeSpec.target, toeSpec.tolerance);
          const camberStatus = getStatus(data.camber, camberSpec.target, camberSpec.tolerance);
          const casterStatus = data.caster != null
            ? getStatus(data.caster, specs.frontCaster.target, specs.frontCaster.tolerance)
            : null;

          const hasIssue = toeStatus !== 'good' || camberStatus !== 'good' || casterStatus === 'bad' || casterStatus === 'warning';

          return (
            <View key={key} style={styles.wheelCard}>
              <View style={styles.wheelHeader}>
                <Text style={styles.wheelTitle}>{WHEEL_LABELS[key]}</Text>
                {hasIssue && (
                  <TouchableOpacity
                    style={styles.fixBtn}
                    onPress={() =>
                      navigation.navigate('WheelDetail', {
                        wheelKey: key,
                        wheelData: data,
                        vehicleProfile,
                        specs,
                      })
                    }
                  >
                    <Text style={styles.fixBtnText}>FIX →</Text>
                  </TouchableOpacity>
                )}
                {!hasIssue && (
                  <View style={styles.okBadge}>
                    <Text style={styles.okBadgeText}>✓ OK</Text>
                  </View>
                )}
              </View>

              <MeasRow
                label="Toe"
                value={data.toe}
                target={toeSpec.target}
                tolerance={toeSpec.tolerance}
                status={toeStatus}
              />
              <MeasRow
                label="Camber"
                value={data.camber}
                target={camberSpec.target}
                tolerance={camberSpec.tolerance}
                status={camberStatus}
              />
              {data.caster != null && casterStatus != null && (
                <MeasRow
                  label="Caster"
                  value={data.caster}
                  target={specs.frontCaster.target}
                  tolerance={specs.frontCaster.tolerance}
                  status={casterStatus}
                />
              )}
            </View>
          );
        })}

        {/* Notes from adjusted specs */}
        {specs.notes.length > 0 && (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>NOTES FOR YOUR SETUP</Text>
            {specs.notes.map((note, i) => (
              <Text key={i} style={styles.noteText}>• {note}</Text>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.restartBtn}
          onPress={() => navigation.navigate('Welcome')}
        >
          <Text style={styles.restartBtnText}>Start New Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

interface MeasRowProps {
  label: string;
  value: number;
  target: number;
  tolerance: number;
  status: 'good' | 'warning' | 'bad';
}

// ─── Thrust Angle Card ────────────────────────────────────────────────────────
// Thrust angle = deviation of rear axle centerline from vehicle centerline.
// 0° = perfect. Positive = rear pushes right. Negative = rear pushes left.
// Tolerance: ±0.25° acceptable, ±0.50° marginal, beyond = dog-tracking risk.

function ThrustAngleCard({ thrustAngle }: { thrustAngle: number }) {
  const abs = Math.abs(thrustAngle);
  const status: 'good' | 'warning' | 'bad' =
    abs <= 0.25 ? 'good' : abs <= 0.5 ? 'warning' : 'bad';
  const color = { good: COLORS.good, warning: COLORS.warning, bad: COLORS.bad }[status];
  const bgColor = { good: COLORS.goodBg, warning: COLORS.warningBg, bad: COLORS.badBg }[status];

  const direction =
    thrustAngle === 0
      ? 'Centered'
      : thrustAngle > 0
      ? `${abs.toFixed(2)}° right of centerline`
      : `${abs.toFixed(2)}° left of centerline`;

  const statusText = {
    good: 'Within spec — no dog-tracking',
    warning: 'Marginal — monitor tire wear',
    bad: 'Out of spec — vehicle will dog-track',
  }[status];

  // Visual gauge: needle sweeps ±2° range mapped to 0-100%
  const MAX_RANGE = 2.0;
  const needlePercent = Math.min(Math.max((thrustAngle + MAX_RANGE) / (MAX_RANGE * 2), 0), 1);

  return (
    <View style={[thrustStyles.card, { borderColor: color }]}>
      <View style={thrustStyles.header}>
        <Text style={thrustStyles.title}>THRUST ANGLE</Text>
        <View style={[thrustStyles.badge, { backgroundColor: bgColor }]}>
          <Text style={[thrustStyles.badgeText, { color }]}>
            {status === 'good' ? '✓ GOOD' : status === 'warning' ? '! MARGINAL' : '✕ OUT OF SPEC'}
          </Text>
        </View>
      </View>

      {/* Visual gauge */}
      <View style={thrustStyles.gaugeContainer}>
        {/* Zone colors */}
        <View style={thrustStyles.gaugeTrack}>
          <View style={[thrustStyles.gaugeZone, { flex: 1, backgroundColor: COLORS.badBg }]} />
          <View style={[thrustStyles.gaugeZone, { flex: 0.5, backgroundColor: COLORS.warningBg }]} />
          <View style={[thrustStyles.gaugeZone, { flex: 1, backgroundColor: COLORS.goodBg }]} />
          <View style={[thrustStyles.gaugeZone, { flex: 0.5, backgroundColor: COLORS.warningBg }]} />
          <View style={[thrustStyles.gaugeZone, { flex: 1, backgroundColor: COLORS.badBg }]} />
        </View>
        {/* Centerline marker */}
        <View style={thrustStyles.centerLine} />
        {/* Needle */}
        <View style={[thrustStyles.needle, { left: `${needlePercent * 100}%`, backgroundColor: color }]} />
        {/* Labels */}
        <View style={thrustStyles.gaugeLabels}>
          <Text style={thrustStyles.gaugeLabel}>-2°</Text>
          <Text style={thrustStyles.gaugeLabel}>-0.5°</Text>
          <Text style={[thrustStyles.gaugeLabelCenter, { color }]}>0°</Text>
          <Text style={thrustStyles.gaugeLabel}>+0.5°</Text>
          <Text style={thrustStyles.gaugeLabel}>+2°</Text>
        </View>
      </View>

      <Text style={[thrustStyles.value, { color }]}>{thrustAngle >= 0 ? '+' : ''}{thrustAngle.toFixed(3)}°</Text>
      <Text style={thrustStyles.direction}>{direction}</Text>
      <Text style={[thrustStyles.statusText, { color }]}>{statusText}</Text>

      {status !== 'good' && (
        <View style={thrustStyles.fixNote}>
          <Text style={thrustStyles.fixNoteTitle}>HOW TO FIX THRUST ANGLE</Text>
          <Text style={thrustStyles.fixNoteText}>
            Thrust angle is corrected by adjusting rear toe. {thrustAngle > 0
              ? 'The rear axle is pushing right — toe-in the rear left wheel or toe-out the rear right wheel slightly.'
              : 'The rear axle is pushing left — toe-in the rear right wheel or toe-out the rear left wheel slightly.'}
            {'\n'}Use the cam bolts on the rear lower control arm. Each 1/4 turn changes toe by ~0.08°.
          </Text>
        </View>
      )}
    </View>
  );
}

const thrustStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 11, fontWeight: '700', color: COLORS.textDim, letterSpacing: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  gaugeContainer: { position: 'relative', height: 40, justifyContent: 'center' },
  gaugeTrack: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gaugeZone: { height: '100%' },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.textDim,
    opacity: 0.5,
  },
  needle: {
    position: 'absolute',
    width: 4,
    height: 24,
    borderRadius: 2,
    top: -4,
    marginLeft: -2,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  gaugeLabel: { color: COLORS.textDim, fontSize: 9, fontFamily: FONTS.mono },
  gaugeLabelCenter: { fontSize: 9, fontFamily: FONTS.mono, fontWeight: '700' },
  value: { fontSize: 32, fontFamily: FONTS.mono, fontWeight: '800', textAlign: 'center' },
  direction: { color: COLORS.textDim, fontSize: 13, textAlign: 'center' },
  statusText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  fixNote: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 4,
  },
  fixNoteTitle: { fontSize: 10, fontWeight: '700', color: COLORS.textDim, letterSpacing: 1.5 },
  fixNoteText: { color: COLORS.textDim, fontSize: 13, lineHeight: 19 },
});

// ─────────────────────────────────────────────────────────────────────────────

function MeasRow({ label, value, target, tolerance, status }: MeasRowProps) {
  const color = { good: COLORS.good, warning: COLORS.warning, bad: COLORS.bad }[status];
  const error = value - target;

  return (
    <View style={styles.measRow}>
      <Text style={styles.measLabel}>{label}</Text>
      <View style={styles.measRight}>
        <Text style={[styles.measValue, { color }]}>{value.toFixed(2)}°</Text>
        <Text style={styles.measTarget}>
          target {target.toFixed(2)}°  ({error >= 0 ? '+' : ''}{error.toFixed(2)}°)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, gap: 16 },
  heading: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subheading: { fontSize: 12, color: COLORS.accent, fontFamily: FONTS.mono },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    gap: 16,
  },
  statusEmoji: { fontSize: 32, fontWeight: '800' },
  statusLabel: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  statusSub: { fontSize: 12, marginTop: 2, fontFamily: FONTS.mono },
  wheelCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  wheelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  wheelTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  fixBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  fixBtnText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  okBadge: {
    backgroundColor: COLORS.goodBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  okBadgeText: { color: COLORS.good, fontWeight: '700', fontSize: 12 },
  measRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  measLabel: { color: COLORS.textDim, fontSize: 14 },
  measRight: { alignItems: 'flex-end' },
  measValue: { fontSize: 20, fontFamily: FONTS.mono, fontWeight: '700' },
  measTarget: { fontSize: 11, color: COLORS.textDim, fontFamily: FONTS.mono, marginTop: 2 },
  notesCard: {
    backgroundColor: COLORS.infoBg,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  notesTitle: { fontSize: 11, fontWeight: '700', color: COLORS.info, letterSpacing: 1.5 },
  noteText: { color: COLORS.textDim, fontSize: 13, lineHeight: 19 },
  restartBtn: { padding: 18, alignItems: 'center', marginBottom: 24 },
  restartBtnText: { color: COLORS.textDim, fontSize: 15 },
});
