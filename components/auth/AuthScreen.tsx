import logo from "@/assets/icons/logo.png";
import { styled } from "nativewind";
import {
  Image,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);
const KeyboardAvoidingView = styled(RNKeyboardAvoidingView);

const AuthScreen = ({ title, subtitle, children, footer }: AuthScreenProps) => {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <View className="items-center">
            <View className="mb-8 flex-row items-center gap-3">
              <View className="size-14 overflow-hidden">
                <Image
                  source={logo}
                  resizeMode="contain"
                  accessibilityLabel="Recurrrrly"
                  style={{ width: "100%", height: "100%" }}
                />
              </View>
              <View>
                <Text className="text-2xl font-sans-extrabold text-primary">
                  Recurrrrly
                </Text>
                <Text className="-mt-0.5 text-[11px] font-sans-semibold uppercase tracking-widest text-muted-foreground">
                  Smart billing
                </Text>
              </View>
            </View>

            <Text className="text-center text-3xl font-sans-bold text-primary">
              {title}
            </Text>
            <Text className="mt-2 max-w-80 text-center text-base font-sans-medium text-muted-foreground">
              {subtitle}
            </Text>
          </View>

          <View className="mt-8 rounded-3xl border border-border bg-card px-5 py-6">
            {children}
          </View>

          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthScreen;
