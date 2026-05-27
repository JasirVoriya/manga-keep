import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/styles/themeContext';

function AppContent() {
  const { themeName } = useTheme();
  const statusBarStyle = themeName === 'darkStudy' ? 'light' : 'dark';

  return (
    <>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style={statusBarStyle} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
