import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlignmentResults, WheelAlignmentData, WheelOrientation } from './src/utils/alignmentMath';
import { VehicleProfile, VehicleSpecs } from './src/constants/vehicleSpecs';

import WelcomeScreen from './src/screens/WelcomeScreen';
import VehicleSetupScreen from './src/screens/VehicleSetupScreen';
import CalibrationScreen from './src/screens/CalibrationScreen';
import MeasurementFlowScreen from './src/screens/MeasurementFlowScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import WheelDetailScreen from './src/screens/WheelDetailScreen';

export type RootStackParamList = {
  Welcome: undefined;
  VehicleSetup: undefined;
  Calibration: { vehicleProfile: VehicleProfile };
  MeasurementFlow: { vehicleProfile: VehicleProfile; baseline: WheelOrientation };
  Results: { results: AlignmentResults; vehicleProfile: VehicleProfile };
  WheelDetail: {
    wheelKey: string;
    wheelData: WheelAlignmentData;
    vehicleProfile: VehicleProfile;
    specs: VehicleSpecs;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerStyle: { backgroundColor: '#0f1117' },
            headerTintColor: '#f0f2ff',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#0f1117' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="VehicleSetup"
            component={VehicleSetupScreen}
            options={{ title: 'Vehicle Setup' }}
          />
          <Stack.Screen
            name="Calibration"
            component={CalibrationScreen}
            options={{ title: 'Surface Calibration' }}
          />
          <Stack.Screen
            name="MeasurementFlow"
            component={MeasurementFlowScreen}
            options={{ title: 'Measuring', headerBackVisible: false }}
          />
          <Stack.Screen
            name="Results"
            component={ResultsScreen}
            options={{ title: 'Alignment Results', headerBackVisible: false }}
          />
          <Stack.Screen
            name="WheelDetail"
            component={WheelDetailScreen}
            options={{ title: 'Fix Wheel' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
