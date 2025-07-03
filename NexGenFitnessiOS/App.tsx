import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import FinalMigration from './FinalMigration';

function App(): React.JSX.Element {
  const apiUrl = 'https://ai-companion-jgsavage98.replit.app';

  const handleBack = () => {
    // No back functionality needed for native app
    console.log('Back navigation not needed in native app');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1a1a1a"
      />
      <FinalMigration apiUrl={apiUrl} onBack={handleBack} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
});

export default App;