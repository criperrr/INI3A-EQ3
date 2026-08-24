import { SemanticSpacing } from "../../types";
import { primitiveSpacing } from "../primitives/spacing";

export const semanticSpacing: SemanticSpacing = {
  screenPaddingHorizontal: primitiveSpacing[5], // 20
  screenPaddingVertical: primitiveSpacing[4],   // 16
  cardPadding: primitiveSpacing[5],             // 20
  cardPaddingSm: primitiveSpacing[3],           // 12
  sectionGap: primitiveSpacing[6],              // 24
  itemGap: primitiveSpacing[4],                 // 16
  elementGap: primitiveSpacing[3],              // 12
  microGap: primitiveSpacing[2],                // 8
  inputHeight: 52,
  buttonHeight: 54,
  headerPaddingHorizontal: primitiveSpacing[5], // 20
  headerPaddingBottom: primitiveSpacing[3],     // 12
  tabBarHeight: 60,
};
