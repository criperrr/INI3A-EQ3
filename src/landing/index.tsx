import { AppRegistry } from "react-native";
import { LandingPage } from "./LandingPage";

AppRegistry.registerComponent("LandingPage", () => LandingPage);

if (typeof document !== "undefined") {
    const rootTag = document.getElementById("root") || document.getElementById("main");
    if (rootTag) {
        AppRegistry.runApplication("LandingPage", {
            initialProps: {},
            rootTag,
        });
    }
}

export default LandingPage;