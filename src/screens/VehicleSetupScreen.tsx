import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import {
  VehicleProfile,
  DEFAULT_VEHICLE_PROFILE,
  TRAILBOSS_2021_FACTORY,
  getLiftAdjustedSpecs,
} from '../constants/vehicleSpecs';
import { COLORS, FONTS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'VehicleSetup'>;
};

export default function VehicleSetupScreen({ navigation }: Props) {
  const [liftHeight, setLiftHeight] = useState('0');
  const [spacerMM, setSpacerMM] = useState('0');
  const [tireWidth, setTireWidth] = useState('275');
  const [tireAspect, setTireAspect] = useState('65');
  const [rimSize, setRimSize] = useState('18');

  function handleContinue() {
    const lift = parseFloat(liftHeight) || 0;
    const spacer = parseFloat(spacerMM) || 0;

    if (lift < 0 || lift > 12) {
      Alert.alert('Invalid Input', 'Lift height should be between 0 and 12 inches.');
      return;
    }
    if (spacer < 0 || spacer > 75) {
      Alert.alert('Invalid Input', 'Spacer thickness should be between 0 and 75mm.');
      return;
    }

    const adjustedSpecs = getLiftAdjustedSpecs(TRAILBOSS_2021_FACTORY, lift, spacer);

    const profile: VehicleProfile = {
      specs: adjustedSpecs,
      liftHeightInches: lift,
      spacerThicknessMM: spacer,
      tireSizeWidth: parseInt(tireWidth) || 275,
      tireSizeAspect: parseInt(tireAspect) || 65,
      tireRimSize: parseInt(rimSize) || 18,
    };

    navigation.navigate('Calibration', { vehicleProfile: profile });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Vehicle Profile</Text>
        <Text style={styles.subheading}>
          2021 Chevy Silverado 1500 Trail Boss LT 5.3L
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>MODIFICATIONS</Text>
          <Text style={styles.cardNote}>
            These values adjust the target alignment specs to account for your lift and spacers.
          </Text>

          <Label text="Lift Height (inches)" />
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={liftHeight}
            onChangeText={setLiftHeight}
            placeholder="e.g. 3.5"
            placeholderTextColor={COLORS.textDim}
          />

          <Label text="Wheel Spacer Thickness (mm per side)" />
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={spacerMM}
            onChangeText={setSpacerMM}
            placeholder="e.g. 25"
            placeholderTextColor={COLORS.textDim}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>TIRE SIZE</Text>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Label text="Width (mm)" />
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={tireWidth}
                onChangeText={setTireWidth}
              />
            </View>
            <View style={styles.flex1}>
              <Label text="Aspect Ratio" />
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={tireAspect}
                onChangeText={setTireAspect}
              />
            </View>
            <View style={styles.flex1}>
              <Label text="Rim (in)" />
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={rimSize}
                onChangeText={setRimSize}
              />
            </View>
          </View>

          <Text style={styles.tireSizePreview}>
            Tire: {tireWidth}/{tireAspect}R{rimSize}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>COMPUTED TARGETS</Text>
          <SpecRow
            label="Front Toe (per wheel)"
            value={`${getLiftAdjustedSpecs(TRAILBOSS_2021_FACTORY, parseFloat(liftHeight) || 0, parseFloat(spacerMM) || 0).frontToePerWheel.target.toFixed(2)}°`}
            tolerance={`±${getLiftAdjustedSpecs(TRAILBOSS_2021_FACTORY, parseFloat(liftHeight) || 0, parseFloat(spacerMM) || 0).frontToePerWheel.tolerance.toFixed(2)}°`}
          />
          <SpecRow
            label="Front Camber"
            value={`${getLiftAdjustedSpecs(TRAILBOSS_2021_FACTORY, parseFloat(liftHeight) || 0, parseFloat(spacerMM) || 0).frontCamber.target.toFixed(2)}°`}
            tolerance={`±${getLiftAdjustedSpecs(TRAILBOSS_2021_FACTORY, parseFloat(liftHeight) || 0, parseFloat(spacerMM) || 0).frontCamber.tolerance.toFixed(2)}°`}
          />
          <SpecRow
            label="Front Caster"
            value={`${getLiftAdjustedSpecs(TRAILBOSS_2021_FACTORY, parseFloat(liftHeight) || 0, parseFloat(spacerMM) || 0).frontCaster.target.toFixed(2)}°`}
            tolerance={`±${getLiftAdjustedSpecs(TRAILBOSS_2021_FACTORY, parseFloat(liftHeight) || 0, parseFloat(spacerMM) || 0).frontCaster.tolerance.toFixed(2)}°`}
          />
          <SpecRow
            label="Rear Toe (per wheel)"
            value={`${getLiftAdjustedSpecs(TRAILBOSS_2021_FACTORY, parseFloat(liftHeight) || 0, parseFloat(spacerMM) || 0).rearToePerWheel.target.toFixed(2)}°`}
            tolerance={`±${getLiftAdjustedSpecs(TRAILBOSS_2021_FACTORY, parseFloat(liftHeight) || 0, parseFloat(spacerMM) || 0).rearToePerWheel.tolerance.toFixed(2)}°`}
          />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
          <Text style={styles.primaryBtnText}>CONTINUE TO CALIBRATION →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function SpecRow({ label, value, tolerance }: { label: string; value: string; tolerance: string }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <View style={styles.specValues}>
        <Text style={styles.specValue}>{value}</Text>
        <Text style={styles.specTolerance}>{tolerance}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, gap: 16 },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: COLORS.accent,
    marginBottom: 8,
    fontFamily: FONTS.mono,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDim,
    letterSpacing: 2,
  },
  cardNote: {
    fontSize: 12,
    color: COLORS.textDim,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    color: COLORS.textDim,
    marginBottom: 2,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
    fontFamily: FONTS.mono,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  tireSizePreview: {
    color: COLORS.accent,
    fontSize: 14,
    fontFamily: FONTS.mono,
    textAlign: 'center',
    marginTop: 4,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  specLabel: { color: COLORS.textDim, fontSize: 13 },
  specValues: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  specValue: { color: COLORS.text, fontSize: 15, fontFamily: FONTS.mono, fontWeight: '700' },
  specTolerance: { color: COLORS.textDim, fontSize: 12, fontFamily: FONTS.mono },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 1.2,
  },
});
