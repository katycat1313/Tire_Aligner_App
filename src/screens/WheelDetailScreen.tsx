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
import { WheelAlignmentData } from '../utils/alignmentMath';
import { VehicleSpecs, AlignmentSpec } from '../constants/vehicleSpecs';
import {
  getToeAdjustmentGuide,
  getCamberAdjustmentGuide,
  getCasterAdjustmentGuide,
  getQuickBrief,
  AdjustmentGuide,
  WheelPosition,
} from '../constants/adjustmentGuide';
import { COLORS, FONTS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WheelDetail'>;
  route: RouteProp<RootStackParamList, 'WheelDetail'>;
};

type FixMode = 'choose' | 'guided' | 'brief';
type AlignmentIssue = 'toe' | 'camber' | 'caster';

function wheelKeyToPosition(key: string): WheelPosition {
  const map: Record<string, WheelPosition> = {
    frontLeft: 'frontLeft',
    frontRight: 'frontRight',
    rearLeft: 'rearLeft',
    rearRight: 'rearRight',
  };
  return map[key] ?? 'frontLeft';
}

export default function WheelDetailScreen({ navigation, route }: Props) {
  const { wheelKey, wheelData, vehicleProfile, specs } = route.params;
  const [fixMode, setFixMode] = useState<FixMode>('choose');
  const [selectedIssue, setSelectedIssue] = useState<AlignmentIssue | null>(null);
  const [guidedStep, setGuidedStep] = useState(0);

  const isFront = wheelKey.includes('front');
  const position = wheelKeyToPosition(wheelKey);

  const toeSpec = isFront ? specs.frontToePerWheel : specs.rearToePerWheel;
  const camberSpec = isFront ? specs.frontCamber : specs.rearCamber;

  function getStatus(value: number, spec: AlignmentSpec): 'good' | 'warning' | 'bad' {
    const diff = Math.abs(value - spec.target);
    if (diff <= spec.tolerance) return 'good';
    if (diff <= spec.tolerance * 1.75) return 'warning';
    return 'bad';
  }

  const toeStatus = getStatus(wheelData.toe, toeSpec);
  const camberStatus = getStatus(wheelData.camber, camberSpec);
  const casterStatus = wheelData.caster != null
    ? getStatus(wheelData.caster, specs.frontCaster)
    : null;

  const issues: AlignmentIssue[] = [];
  if (toeStatus !== 'good') issues.push('toe');
  if (camberStatus !== 'good') issues.push('camber');
  if (casterStatus && casterStatus !== 'good') issues.push('caster');

  function getGuide(issue: AlignmentIssue): AdjustmentGuide {
    switch (issue) {
      case 'toe': return getToeAdjustmentGuide(position, wheelData.toe - toeSpec.target);
      case 'camber': return getCamberAdjustmentGuide(position, wheelData.camber - camberSpec.target);
      case 'caster': return getCasterAdjustmentGuide(position, (wheelData.caster ?? 0) - specs.frontCaster.target);
    }
  }

  function getCurrentValue(issue: AlignmentIssue): number {
    switch (issue) {
      case 'toe': return wheelData.toe;
      case 'camber': return wheelData.camber;
      case 'caster': return wheelData.caster ?? 0;
    }
  }

  function getTarget(issue: AlignmentIssue): number {
    switch (issue) {
      case 'toe': return toeSpec.target;
      case 'camber': return camberSpec.target;
      case 'caster': return specs.frontCaster.target;
    }
  }

  const statusColor = (s: 'good' | 'warning' | 'bad') =>
    ({ good: COLORS.good, warning: COLORS.warning, bad: COLORS.bad }[s]);

  const wheelLabel = wheelKey
    .replace('frontLeft', 'Front Left')
    .replace('frontRight', 'Front Right')
    .replace('rearLeft', 'Rear Left')
    .replace('rearRight', 'Rear Right');

  // ── GUIDED FIX VIEW ──────────────────────────────────────────────────────────
  if (fixMode === 'guided' && selectedIssue) {
    const guide = getGuide(selectedIssue);
    const step = guide.steps[guidedStep];
    const isLast = guidedStep === guide.steps.length - 1;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.backLink} onPress={() => { setFixMode('choose'); setGuidedStep(0); }}>
            ← Back to issues
          </Text>

          <Text style={styles.heading}>{wheelLabel}</Text>
          <Text style={styles.subheading}>{selectedIssue.toUpperCase()} ADJUSTMENT</Text>

          <View style={styles.componentCard}>
            <Text style={styles.componentLabel}>COMPONENT</Text>
            <Text style={styles.componentName}>{guide.component}</Text>
            <View style={styles.toolsRow}>
              {guide.toolsNeeded.map((t) => (
                <View key={t} style={styles.toolChip}>
                  <Text style={styles.toolText}>{t}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.timeEstimate}>⏱ Est. {guide.estimatedTimeMinutes} min</Text>
          </View>

          {/* Step counter */}
          <View style={styles.stepHeader}>
            <Text style={styles.stepCounter}>
              Step {guidedStep + 1} of {guide.steps.length}
            </Text>
          </View>

          <View style={styles.stepCard}>
            <Text style={styles.stepText}>{step.instruction}</Text>
            {step.warning && (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>⚠️ {step.warning}</Text>
              </View>
            )}
          </View>

          {guide.note && (
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>💡 {guide.note}</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            {!isLast ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setGuidedStep(guidedStep + 1)}
              >
                <Text style={styles.primaryBtnText}>NEXT STEP →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: COLORS.good }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.primaryBtnText}>DONE — GO BACK TO RESULTS</Text>
              </TouchableOpacity>
            )}
            {guidedStep > 0 && (
              <TouchableOpacity style={styles.backBtn} onPress={() => setGuidedStep(guidedStep - 1)}>
                <Text style={styles.backBtnText}>← Previous Step</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── QUICK BRIEF VIEW ─────────────────────────────────────────────────────────
  if (fixMode === 'brief') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.backLink} onPress={() => setFixMode('choose')}>
            ← Back
          </Text>
          <Text style={styles.heading}>{wheelLabel}</Text>
          <Text style={styles.subheading}>QUICK BRIEF</Text>

          {issues.map((issue) => (
            <View key={issue} style={styles.briefCard}>
              <Text style={styles.briefIssueLabel}>{issue.toUpperCase()}</Text>
              <Text style={styles.briefText}>
                {getQuickBrief(
                  issue,
                  position,
                  getCurrentValue(issue),
                  getTarget(issue),
                  '°'
                )}
              </Text>
            </View>
          ))}

          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>← BACK TO RESULTS</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── CHOOSE MODE VIEW ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.backLink} onPress={() => navigation.goBack()}>← Results</Text>
        <Text style={styles.heading}>{wheelLabel}</Text>
        <Text style={styles.subheading}>ISSUES FOUND</Text>

        {/* Issue summary */}
        {issues.map((issue) => {
          const current = getCurrentValue(issue);
          const target = getTarget(issue);
          const error = current - target;
          const status = issue === 'toe' ? toeStatus : issue === 'camber' ? camberStatus : casterStatus ?? 'good';

          return (
            <View key={issue} style={styles.issueCard}>
              <View style={styles.issueHeader}>
                <Text style={styles.issueType}>{issue.toUpperCase()}</Text>
                <View style={[styles.issueBadge, { backgroundColor: `${statusColor(status)}22` }]}>
                  <Text style={[styles.issueBadgeText, { color: statusColor(status) }]}>
                    {status === 'warning' ? 'CLOSE' : 'OUT OF SPEC'}
                  </Text>
                </View>
              </View>
              <Text style={styles.issueValues}>
                Current: <Text style={{ color: statusColor(status), fontFamily: FONTS.mono }}>{current.toFixed(2)}°</Text>
                {'  '}Target: <Text style={{ color: COLORS.text, fontFamily: FONTS.mono }}>{target.toFixed(2)}°</Text>
                {'  '}Error: <Text style={{ color: statusColor(status), fontFamily: FONTS.mono }}>{error >= 0 ? '+' : ''}{error.toFixed(2)}°</Text>
              </Text>
            </View>
          );
        })}

        <Text style={styles.chooseLabel}>HOW WOULD YOU LIKE TO FIX THIS?</Text>

        {/* Guided fix — pick issue */}
        <View style={styles.choiceCard}>
          <Text style={styles.choiceTitle}>Guided Fix</Text>
          <Text style={styles.choiceDesc}>
            Step-by-step instructions, one task at a time. Walks you through tool list, procedure, and warnings.
          </Text>
          {issues.map((issue) => (
            <TouchableOpacity
              key={issue}
              style={styles.issueSelectBtn}
              onPress={() => { setSelectedIssue(issue); setFixMode('guided'); setGuidedStep(0); }}
            >
              <Text style={styles.issueSelectText}>Fix {issue.charAt(0).toUpperCase() + issue.slice(1)} →</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick brief */}
        <TouchableOpacity style={styles.briefBtn} onPress={() => setFixMode('brief')}>
          <Text style={styles.briefBtnTitle}>Skip — Just Tell Me What's Wrong</Text>
          <Text style={styles.briefBtnDesc}>
            One-paragraph summary of all issues and what needs adjusting. No step-by-step.
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, gap: 16 },
  backLink: { color: COLORS.accent, fontSize: 14, marginBottom: 4 },
  heading: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subheading: { fontSize: 11, color: COLORS.textDim, letterSpacing: 2, fontFamily: FONTS.mono },
  issueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  issueHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  issueType: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  issueBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  issueBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  issueValues: { color: COLORS.textDim, fontSize: 13, lineHeight: 20 },
  chooseLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textDim, letterSpacing: 2, marginTop: 8 },
  choiceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  choiceTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  choiceDesc: { color: COLORS.textDim, fontSize: 13, lineHeight: 19 },
  issueSelectBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  issueSelectText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  briefBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  briefBtnTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  briefBtnDesc: { color: COLORS.textDim, fontSize: 13, lineHeight: 18 },
  // Guided view
  componentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  componentLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textDim, letterSpacing: 2 },
  componentName: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  toolsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toolChip: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  toolText: { color: COLORS.textDim, fontSize: 12 },
  timeEstimate: { color: COLORS.accent, fontSize: 13, fontFamily: FONTS.mono },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepCounter: { color: COLORS.textDim, fontSize: 13, fontFamily: FONTS.mono },
  stepCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    gap: 14,
    minHeight: 120,
    justifyContent: 'center',
  },
  stepText: { color: COLORS.text, fontSize: 17, lineHeight: 26 },
  warningCard: {
    backgroundColor: COLORS.warningBg,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  warningText: { color: COLORS.warning, fontSize: 13, lineHeight: 18 },
  noteCard: {
    backgroundColor: COLORS.infoBg,
    borderRadius: 10,
    padding: 14,
  },
  noteText: { color: COLORS.textDim, fontSize: 13, lineHeight: 19 },
  btnRow: { gap: 12 },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1 },
  backBtn: { padding: 14, alignItems: 'center' },
  backBtnText: { color: COLORS.textDim, fontSize: 14 },
  // Brief view
  briefCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  briefIssueLabel: { fontSize: 11, fontWeight: '700', color: COLORS.accent, letterSpacing: 2 },
  briefText: { color: COLORS.text, fontSize: 14, lineHeight: 22 },
});
