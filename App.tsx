import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { authService } from './src/services/firebase';
import { RootNavigator } from './src/navigation';
import { ActiveCarProvider } from './src/context/ActiveCarContext';
import { startBackgroundSync } from './src/db/sync';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return authService.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      if (initializing) setInitializing(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Синхронизация идёт, только пока пользователь авторизован; при выходе — останавливаем.
  useEffect(() => {
    if (!isAuthenticated) return;
    const stop = startBackgroundSync();
    return stop;
  }, [isAuthenticated]);

  if (initializing) return null; // TODO: сплэш-экран

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F12" />
      <ActiveCarProvider>
        <RootNavigator isAuthenticated={isAuthenticated} />
      </ActiveCarProvider>
    </>
  );
}
