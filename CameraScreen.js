import React, { useEffect } from 'react';
import { View, Text, Button, Linking, Alert } from 'react-native';

const App = () => {
  const handleDeepLink = (event) => {
    Alert.alert('딥 링크 URL', event.url);  // 딥 링크 URL 처리
  };

  useEffect(() => {
    // 앱이 백그라운드에서 열릴 때 딥 링크를 처리
    const handleLinking = (event) => {
      handleDeepLink(event);
    };

    // URL 리스너 추가
    Linking.addEventListener('url', handleLinking);

    // 앱이 처음 열릴 때 딥 링크를 확인
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // 컴포넌트가 언마운트되면 이벤트 리스너 제거
    return () => {
      Linking.removeEventListener('url', handleLinking);
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>딥 링크 테스트 앱</Text>
      <Button
        title="웹 페이지로 이동"
        onPress={() => Linking.openURL('https://15.164.74.145:5001/')} // 웹 페이지로 이동
      />
    </View>
  );
};

export default App;
