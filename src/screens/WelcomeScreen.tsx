import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <Text style={styles.logo}>⬡</Text>
        <Text style={styles.title}>ALIGNMENT PRO</Text>
        <Text style={styles.subtitle}>3D Jig Wheel Alignment Tool</Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: '📐', label: 'Camber', desc: 'Gravity-based, ±0.1° accuracy' },
          { icon: '↔️', label: 'Toe', desc: 'Thrust-line referenced' },
          { icon: '🔄', label: 'Caster', desc: 'Steering sweep method' },
          { icon: '📊', label: 'Reports', desc: 'Guided fix or quick brief' },
        ].map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('VehicleSetup')}
        >
          <Text style={styles.primaryBtnText}>START ALIGNMENT SESSION</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          For best results, perform on a flat, level surface. Two-person operation recommended for caster measurement.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 4,
    fontFamily: FONTS.mono,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textDim,
    marginTop: 6,
    letterSpacing: 1,
  },
  features: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  featureDesc: {
    color: COLORS.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    paddingBottom: 24,
    gap: 16,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1.5,
  },
  disclaimer: {
    color: COLORS.textDim,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
