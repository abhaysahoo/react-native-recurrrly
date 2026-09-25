import AuthField from "@/components/auth/AuthField";
import AuthScreen from "@/components/auth/AuthScreen";
import {
  clerkErrorMessage,
  clerkFieldMessage,
  clerkFormMessage,
  completeAuthSession,
  isAlreadySignedInError,
  MIN_PASSWORD_LENGTH,
  validateCode,
  validateEmail,
  validatePassword,
} from "@/lib/auth";
import { useClerk, useSignIn } from "@clerk/expo";
import clsx from "clsx";
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type SignInStep =
  | "credentials"
  | "verify"
  | "forgot"
  | "forgot-code"
  | "new-password";

const SignIn = () => {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { setActive } = useClerk();

  const [step, setStep] = useState<SignInStep>("credentials");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [localErrors, setLocalErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();

  const isBusy = fetchStatus === "fetching";
  const displayedFormError = formError ?? clerkFormMessage(errors);

  const copy = {
    credentials: {
      title: "Welcome back",
      subtitle: "Sign in to continue managing your subscriptions",
    },
    verify: {
      title: "Confirm it's you",
      subtitle: `Enter the 6-digit code we sent to ${emailAddress.trim() || "your email"}`,
    },
    forgot: {
      title: "Reset your password",
      subtitle: "We'll email a code so you can choose a new password",
    },
    "forgot-code": {
      title: "Check your email",
      subtitle: `Enter the 6-digit code we sent to ${emailAddress.trim() || "your email"}`,
    },
    "new-password": {
      title: "Choose a new password",
      subtitle: `Use at least ${MIN_PASSWORD_LENGTH} characters for your Recurrrrly account`,
    },
  }[step];

  const clearFieldError = (field: keyof AuthFieldErrors) => {
    setLocalErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
  };

  const beginCodeChallenge = async () => {
    const emailCodeFactor = signIn.supportedSecondFactors.find(
      (factor) => factor.strategy === "email_code",
    );

    if (!emailCodeFactor) {
      setFormError(
        "This account needs an extra verification step that isn't available here yet.",
      );
      return;
    }

    const { error } = await signIn.mfa.sendEmailCode();
    if (error) {
      setFormError(clerkErrorMessage(error));
      return;
    }

    setCode("");
    setStep("verify");
  };

  const activateExistingSession = async () => {
    const sessionId = signIn.existingSession?.sessionId;
    if (!sessionId) return false;

    await setActive({ session: sessionId });
    return true;
  };

  const finishSignIn = async () => {
    const finalizeError = await completeAuthSession(signIn);
    if (finalizeError) {
      setFormError(finalizeError);
    }
  };

  const handlePasswordSignIn = async () => {
    const nextErrors: AuthFieldErrors = {
      email: validateEmail(emailAddress),
      password: validatePassword(password),
    };

    setLocalErrors(nextErrors);
    setFormError(undefined);

    if (nextErrors.email || nextErrors.password) return;

    const { error } = await signIn.password({
      emailAddress: emailAddress.trim(),
      password,
    });

    if (error) {
      if (isAlreadySignedInError(error) && (await activateExistingSession())) {
        return;
      }

      setFormError(clerkErrorMessage(error));
      return;
    }

    if (signIn.status === "complete") {
      await finishSignIn();
      return;
    }

    if (signIn.status === "needs_client_trust") {
      const { error: trustError } = await signIn.mfa.sendEmailCode();
      if (trustError) {
        setFormError(clerkErrorMessage(trustError));
        return;
      }

      setCode("");
      setStep("verify");
      return;
    }

    if (signIn.status === "needs_second_factor") {
      await beginCodeChallenge();
      return;
    }

    setFormError("We couldn't finish signing you in. Try again.");
  };

  const handleVerify = async () => {
    const codeError = validateCode(code);
    setLocalErrors({ code: codeError });
    setFormError(undefined);
    if (codeError) return;

    const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
    if (error) {
      setFormError(clerkErrorMessage(error));
      return;
    }

    if (signIn.status === "complete") {
      await finishSignIn();
      return;
    }

    setFormError("That code didn't complete sign-in. Request a new one.");
  };

  const handleSendResetCode = async () => {
    const emailError = validateEmail(emailAddress);
    setLocalErrors({ email: emailError });
    setFormError(undefined);
    if (emailError) return;

    const { error: createError } = await signIn.create({
      identifier: emailAddress.trim(),
    });
    if (createError) {
      setFormError(clerkErrorMessage(createError));
      return;
    }

    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendError) {
      setFormError(clerkErrorMessage(sendError));
      return;
    }

    setCode("");
    setStep("forgot-code");
  };

  const handleVerifyResetCode = async () => {
    const codeError = validateCode(code);
    setLocalErrors({ code: codeError });
    setFormError(undefined);
    if (codeError) return;

    const { error } = await signIn.resetPasswordEmailCode.verifyCode({
      code: code.trim(),
    });
    if (error) {
      setFormError(clerkErrorMessage(error));
      return;
    }

    setPassword("");
    setStep("new-password");
  };

  const handleSubmitNewPassword = async () => {
    const passwordError = validatePassword(password);
    setLocalErrors({ password: passwordError });
    setFormError(undefined);
    if (passwordError) return;

    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });
    if (error) {
      setFormError(clerkErrorMessage(error));
      return;
    }

    if (signIn.status === "complete") {
      await finishSignIn();
      return;
    }

    setFormError("We couldn't update your password. Try again.");
  };

  const handleStartOver = async () => {
    await signIn.reset();
    setCode("");
    setPassword("");
    setLocalErrors({});
    setFormError(undefined);
    setStep("credentials");
  };

  const primaryAction = {
    credentials: {
      label: "Sign in",
      onPress: handlePasswordSignIn,
      disabled: isBusy,
    },
    verify: {
      label: "Verify",
      onPress: handleVerify,
      disabled: isBusy,
    },
    forgot: {
      label: "Send reset code",
      onPress: handleSendResetCode,
      disabled: isBusy,
    },
    "forgot-code": {
      label: "Verify code",
      onPress: handleVerifyResetCode,
      disabled: isBusy,
    },
    "new-password": {
      label: "Update password",
      onPress: handleSubmitNewPassword,
      disabled: isBusy,
    },
  }[step];

  return (
    <AuthScreen
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        step === "credentials" ? (
          <View className="mt-6 flex-row items-center justify-center gap-1">
            <Text className="text-sm font-sans-medium text-muted-foreground">
              New to Recurrrrly?
            </Text>
            <Link href="/(auth)/sign-up">
              <Text className="text-sm font-sans-bold text-accent">
                Create an account
              </Text>
            </Link>
          </View>
        ) : (
          <View className="mt-6 flex-row items-center justify-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
              onPress={handleStartOver}
            >
              <Text className="text-sm font-sans-bold text-accent">
                Back to sign in
              </Text>
            </Pressable>
          </View>
        )
      }
    >
      <View className="gap-5">
        {(step === "credentials" || step === "forgot") && (
          <AuthField
            label="Email"
            value={emailAddress}
            onChangeText={(value) => {
              setEmailAddress(value);
              clearFieldError("email");
            }}
            placeholder="Enter your email"
            error={
              localErrors.email ?? clerkFieldMessage(errors.fields.identifier)
            }
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType={step === "forgot" ? "done" : "next"}
          />
        )}

        {step === "credentials" && (
          <>
            <AuthField
              label="Password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearFieldError("password");
              }}
              placeholder="Enter your password"
              error={
                localErrors.password ??
                clerkFieldMessage(errors.fields.password)
              }
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handlePasswordSignIn}
            />

            <View className="items-end">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Forgot password?"
                onPress={() => {
                  setLocalErrors({});
                  setFormError(undefined);
                  setStep("forgot");
                }}
              >
                <Text className="text-sm font-sans-bold text-accent">
                  Forgot password?
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {(step === "verify" || step === "forgot-code") && (
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
          />
        )}

        {step === "new-password" && (
          <AuthField
            label="New password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              clearFieldError("password");
            }}
            placeholder="Create a new password"
            error={
              localErrors.password ?? clerkFieldMessage(errors.fields.password)
            }
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={handleSubmitNewPassword}
          />
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
            primaryAction.disabled && "opacity-50",
          )}
          onPress={primaryAction.onPress}
          disabled={primaryAction.disabled}
          accessibilityRole="button"
          accessibilityLabel={primaryAction.label}
        >
          {isBusy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-sans-bold text-white">
              {primaryAction.label}
            </Text>
          )}
        </Pressable>

        {(step === "verify" || step === "forgot-code") && (
          <Pressable
            className="items-center rounded-3xl border border-accent/30 bg-accent/10 py-3"
            onPress={
              step === "verify"
                ? () => signIn.mfa.sendEmailCode()
                : () => signIn.resetPasswordEmailCode.sendCode()
            }
            disabled={isBusy}
          >
            <Text className="text-sm font-sans-semibold text-accent">
              Send a new code
            </Text>
          </Pressable>
        )}
      </View>
    </AuthScreen>
  );
};

export default SignIn;
