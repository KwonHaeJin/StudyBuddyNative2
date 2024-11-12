import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Button } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Login = () => {
    const navigation = useNavigation();
    return(
        <SafeAreaView>
            <Button title="메인으로" onPress={()=> {navigation.navigate("Main" as never)}}></Button>
        </SafeAreaView>
    );
};

export default Login;