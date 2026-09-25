import AuthField from "@/components/auth/AuthField";
import AuthScreen from "@/components/auth/AuthScreen";
import {
  clerkErrorMessage,
  clerkFieldMessage,
  clerkFormMessage,
  completeAuthSession,
  MIN_PASSWORD_LENGTH,
  validateCode,
  validateEmail,
  validatePassword,
} from "@/lib/auth";
import { useSignUp } from "@clerk/expo";
import clsx from "clsx";
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

const SignUp = () => {
  const { signUp, errors, fetchStatus } = useSignUp();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [localErrors, setLocalErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();

  const isBusy = fetchStatus === "fetching";
  const displayedFormError = formError ?? clerkFormMessage(errors);
  const showVerification =
    isVerifying ||
    (signUp.status === "missing_requirements" &&
      signUp.unverifiedFields.includes("email_address") &&
      signUp.missingFields.length === 0);

  const clearFieldError = (field: keyof AuthFieldErrors) => {
    setLocalErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  };

  const finishSignUp = async () => {
    const finalizeError = await completeAuthSession(signUp);
    if (finalizeError) {
      setFormError(finalizeError);
    }
  };

  const handleSignUp = async () => {
    const nextErrors: AuthFieldErrors = {
      email: validateEmail(emailAddress),
      password: validatePassword(password),
    };

    setLocalErrors(nextErrors);
    setFormError(undefined);
    if (nextErrors.email || nextErrors.password) return;

    const { error } = await signUp.password({
      emailAddress: emailAddress.trim(),
      password,
    });
    if (error) {
      setFormError(clerkErrorMessage(error));
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) {
      setFormError(clerkErrorMessage(sendError));
      return;
    }

    setCode("");
    setIsVerifying(true);
  };

  const handleVerify = async () => {
    const codeError = validateCode(code);
    setLocalErrors({ code: codeError });
    setFormError(undefined);
    if (codeError) return;

    const { error } = await signUp.verifications.verifyEmailCode({
      code: code.trim(),
    });
    if (error) {
      setFormError(clerkErrorMessage(error));
      return;
    }

    if (signUp.status === "complete") {
      await finishSignUp();
      return;
    }

    setFormError(
      "We still need a bit more information to finish creating your account.",
    );
  };

  const handleStartOver = async () => {
    await signUp.reset();
    setIsVerifying(false);
    setCode("");
    setLocalErrors({});
    setFormError(undefined);
  };

  return (
    <AuthScreen
      title={showVerification ? "Check your email" : "Create an account"}
      subtitle={
        showVerification
          ? `Enter the 6-digit code we sent to ${emailAddress.trim() || "your email"}`
          : "Sign up to start managing your subscriptions"
      }
      footer={
        showVerification ? (
          <View className="mt-6 flex-row items-center justify-center">
            <Pressable onPress={handleStartOver}>
              <Text className="text-sm font-sans-bold text-accent">
                Use a different email
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="mt-6 flex-row items-center justify-center gap-1">
            <Text className="text-sm font-sans-medium text-muted-foreground">
              Already have an account?
            </Text>
            <Link href="/(auth)/sign-in">
              <Text className="text-sm font-sans-bold text-accent">
                Sign in
              </Text>
            </Link>
          </View>
        )
      }
    >
      <View className="gap-5">
        {showVerification ? (
          <AuthField
            label="Verification code"
            value={code}
            onChangeText={(value) => {
              setCode(value);
              clearFieldError("code");
            }}
            placeholder="Enter the 6-digit code"
            error={localErrors.code ?? clerkFieldMessage(errors.fields.code)}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="done"
            onSubmitEditing={handleVerify}
          />
        ) : (
          <>
            <AuthField
              label="Email"
              value={emailAddress}
              onChangeText={(value) => {
                setEmailAddress(value);
                clearFieldError("email");
              }}
              placeholder="Enter your email"
              error={
                localErrors.email ??
                clerkFieldMessage(errors.fields.emailAddress)
              }
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <AuthField
              label="Password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearFieldError("password");
              }}
              placeholder="Create a password"
              error={
                localErrors.password ??
                clerkFieldMessage(errors.fields.password)
              }
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />

            <Text className="text-sm font-sans-medium text-muted-foreground">
              Use at least {MIN_PASSWORD_LENGTH} characters.
            </Text>
          </>
        )}

        {displayedFormError ? (
          <Text
            selectable
            className="text-sm font-sans-medium text-destructive"
          >
            {displayedFormError}
          </Text>
        ) : null}

        <Pressable
          className={clsx(
            "items-center rounded-3xl bg-accent py-4",
            isBusy && "opacity-50",
          )}
          onPress={showVerification ? handleVerify : handleSignUp}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel={showVerification ? "Verify" : "Create an account"}
        >
          {isBusy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-sans-bold text-white">
              {showVerification ? "Verify" : "Create an account"}
            </Text>
          )}
        </Pressable>

        {showVerification ? (
          <Pressable
            className="items-center rounded-3xl border border-accent/30 bg-accent/10 py-3"
            onPress={() => signUp.verifications.sendEmailCode()}
            disabled={isBusy}
          >
            <Text className="text-sm font-sans-semibold text-accent">
              Send a new code
            </Text>
          </Pressable>
        ) : (
          <View nativeID="clerk-captcha" />
        )}
      </View>
    </AuthScreen>
  );
};

export default SignUp;
