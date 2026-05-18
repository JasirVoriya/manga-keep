import { StatusBar } from 'expo-status-bar';
import { LibraryScreen } from './src/screens/LibraryScreen';

export default function App() {
  return (
    <>
      <LibraryScreen />
      <StatusBar style="dark" />
    </>
  );
}
