import { Text, type TextProps } from "react-native";
import { Colors, Type, type TypeVariant } from "@/constants/theme";

type Tone = "default" | "secondary" | "muted" | "inverse" | "accent" | "positive" | "negative";

const TONE: Record<Tone, string> = {
  default: Colors.text,
  secondary: Colors.textSecondary,
  muted: Colors.textMuted,
  inverse: Colors.textInverse,
  accent: Colors.accent,
  positive: Colors.positive,
  negative: Colors.negative,
};

export function AppText({
  variant = "body",
  tone = "default",
  style,
  ...props
}: TextProps & { variant?: TypeVariant; tone?: Tone }) {
  return <Text {...props} style={[Type[variant], { color: TONE[tone] }, style]} />;
}
