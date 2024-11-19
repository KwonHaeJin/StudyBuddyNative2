import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from './Login'; // 로그인 페이지
import Main from './Main';   // 메인 페이지

const Stack = createNativeStackNavigator();

export default function App() {
    const [isLoading, setIsLoading] = useState(true); // 로딩 상태
    const [isAuthenticated, setIsAuthenticated] = useState(false); // 인증 상태

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // AsyncStorage에서 토큰 가져오기
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    setIsAuthenticated(true); // 토큰이 있으면 인증 성공
                } else {
                    setIsAuthenticated(false); // 토큰이 없으면 인증 실패
                }
            } catch (error) {
                console.error('Error checking authentication:', error);
                setIsAuthenticated(false); // 에러 발생 시 인증 실패로 처리
            } finally {
                setIsLoading(false); // 로딩 완료
            }
        };

        initializeAuth(); // 초기화 함수 호출
    }, []);

    if (isLoading) {
        // 로딩 화면 표시
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName={isAuthenticated ? "Main" : "Login"}>
                <Stack.Screen
                    name="Login"
                    component={Login}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Main"
                    component={Main}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
