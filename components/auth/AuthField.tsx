import { colors } from "@/constants/theme";
import clsx from "clsx";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

const inputClassName =
  "rounded-3xl border border-border bg-background px-4 py-4 text-base font-sans-medium text-primary";

const AuthField = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize = "none",
  autoComplete,
  textContentType,
  editable = true,
  returnKeyType,
  onSubmitEditing,
}: AuthFieldProps) => {
  const [isHidden, setIsHidden] = useState(secureTextEntry);

  return (
    <View className="gap-2">
      <Text className="text-base font-sans-semibold text-primary">{label}</Text>

      {secureTextEntry ? (
        <View
          className={clsx(
            "flex-row items-center rounded-3xl border border-border bg-background",
            error && "border-destructive",
          )}
        >
          <TextInput
            className="min-w-0 flex-1 px-4 py-4 text-base font-sans-medium text-primary"
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={isHidden}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            textContentType={textContentType}
            editable={editable}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            autoCorrect={false}
          />
          <Pressable
            className="px-4 py-4"
            onPress={() => setIsHidden((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={isHidden ? "Show password" : "Hide password"}
          >
            <Text className="text-sm font-sans-semibold text-accent">
              {isHidden ? "Show" : "Hide"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <TextInput
          className={clsx(inputClassName, error && "border-destructive")}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCorrect={false}
        />
      )}

      {error ? (
        <Text selectable className="text-xs font-sans-medium text-destructive">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default AuthField;
