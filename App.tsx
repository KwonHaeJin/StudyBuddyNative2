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
                // 새로고침 시 토큰 제거
                await AsyncStorage.removeItem('token');
                setIsAuthenticated(false); // 인증 상태 초기화
            } catch (error) {
                console.error('Error resetting authentication:', error);
                setIsAuthenticated(false);
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
            <Stack.Navigator initialRouteName="Login">
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
