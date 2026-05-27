import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LibraryScreen } from '../screens/LibraryScreen';
import { CatalogCenterScreen } from '../screens/CatalogCenterScreen';
import { IssueDetailScreen } from '../screens/IssueDetailScreen';
import { BatchActionScreen } from '../screens/BatchActionScreen';
import { ImportExportScreen } from '../screens/ImportExportScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { ReplenishmentListScreen } from '../screens/ReplenishmentListScreen';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Onboarding">
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Library" component={LibraryScreen} />
      <Stack.Screen name="CatalogCenter" component={CatalogCenterScreen} />
      <Stack.Screen name="IssueDetail" component={IssueDetailScreen} />
      <Stack.Screen name="BatchAction" component={BatchActionScreen} />
      <Stack.Screen name="ImportExport" component={ImportExportScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="ReplenishmentList" component={ReplenishmentListScreen} />
    </Stack.Navigator>
  );
}
