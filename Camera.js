import React, { useEffect } from 'react';
import { View, Text, Button, Linking, Alert } from 'react-native';

const App = () => {
  const handleDeepLink = (event) => {
    Alert.alert('딥 링크 URL', event.url);  // 딥 링크 URL을 처리
  };

  useEffect(() => {
    // 앱이 백그라운드에서 열릴 때 딥 링크 처리
    Linking.addEventListener('url', handleDeepLink);

    // 앱이 처음 열릴 때 (딥 링크 URL이 있으면)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // clean up the event listener when the component unmounts
    return () => {
      Linking.removeEventListener('url', handleDeepLink);
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>앱을 돌아왔습니다!</Text>
      <Button
        title="웹 페이지로 이동"
        onPress={() => Linking.openURL('http://15.164.74.145:5001/')} // 웹 페이지로 이동
      />
    </View>
  );
};

export default App;
