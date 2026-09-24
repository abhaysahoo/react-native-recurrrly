import { styled } from "nativewind";
import React from "react";
import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const onboarding = () => {
  return (
    <SafeAreaView>
      <Text>onboarding</Text>
    </SafeAreaView>
  );
};

export default onboarding;
