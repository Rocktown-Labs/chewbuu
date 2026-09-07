// Must run synchronously before any other module evaluates: Hermes has no
// secure RNG, and libraries (e.g. UUID generation) may require it at import
// time. Without this, route modules can throw during evaluation.
import "react-native-get-random-values";
import structuredClone from "@ungap/structured-clone";
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  const setupPolyfills = async () => {
    const { polyfillGlobal } =
      await import("react-native/Libraries/Utilities/PolyfillFunctions");

    const { TextEncoderStream, TextDecoderStream } =
      await import("@stardazed/streams-text-encoding");

    if (!("structuredClone" in global)) {
      polyfillGlobal("structuredClone", () => structuredClone);
    }

    polyfillGlobal("TextEncoderStream", () => TextEncoderStream);
    polyfillGlobal("TextDecoderStream", () => TextDecoderStream);
  };

  setupPolyfills();
}
