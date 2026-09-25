import { colors } from "@/constants/theme";
import { useAuth, useUser } from "@clerk/expo";
import clsx from "clsx";
import { styled } from "nativewind";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="list-title">Settings</Text>
      <Text className="mt-2 text-base font-sans-medium text-muted-foreground">
        {user?.primaryEmailAddress?.emailAddress ??
          "Manage your Recurrrrly account on this device."}
      </Text>

      <View className="mt-8">
        <Pressable
          className={clsx(
            "auth-button",
            isSigningOut && "auth-button-disabled",
          )}
          onPress={handleLogOut}
          disabled={isSigningOut}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          {isSigningOut ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text className="auth-button-text">Log out</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default Settings;
