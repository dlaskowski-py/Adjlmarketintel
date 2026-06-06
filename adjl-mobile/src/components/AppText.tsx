import { Text, type TextProps } from "react-native";
import { Colors, Fonts } from "@/constants/adjl";

type Variant =
  | "display"
  | "displayBold"
  | "displayLight"
  | "displayItalic"
  | "body"
  | "bodyMedium"
  | "bodySemibold"
  | "bodyBold"
  | "bodyLight"
  | "condensed"
  | "condensedMedium";

const FAMILY: Record<Variant, string> = {
  display: Fonts.display,
  displayBold: Fonts.displayBold,
  displayLight: Fonts.displayLight,
  displayItalic: Fonts.displayItalic,
  body: Fonts.body,
  bodyMedium: Fonts.bodyMedium,
  bodySemibold: Fonts.bodySemibold,
  bodyBold: Fonts.bodyBold,
  bodyLight: Fonts.bodyLight,
  condensed: Fonts.condensed,
  condensedMedium: Fonts.condensedMedium,
};

export function AppText({
  variant = "body",
  style,
  ...props
}: TextProps & { variant?: Variant }) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: FAMILY[variant], color: Colors.cream }, style]}
    />
  );
}
