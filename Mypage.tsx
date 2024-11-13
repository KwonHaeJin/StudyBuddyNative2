/* eslint-disable @typescript-eslint/no-unused-vars */
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Mypage = () => {
    const navigation = useNavigation();
    return(
        <SafeAreaView>
            <Text>마이페이지</Text>
        </SafeAreaView>
    );
};

export default Mypage;