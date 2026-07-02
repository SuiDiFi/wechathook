import type { SignGroupConfig } from "@wechathook/shared";
import { asInt, asString, isOpEnabled } from "./form-parser.js";
import type { FormValues } from "./types.js";

/** 萌兔 sign.json form 字段 → SignGroupConfig */
export function mapSignFormValues(values: FormValues): SignGroupConfig {
  if (!isOpEnabled(values)) return { enabled: false };
  return {
    enabled: true,
    keyword: asString(values.sign_content, "签到"),
    messageTemplate: asString(values.message, ""),
    minCoins: asInt(values.min_jb, 100),
    maxCoins: asInt(values.max_jb, 9990),
    minDiamonds: asInt(values.min_jf, 0),
    maxDiamonds: asInt(values.max_jf, 0),
  };
}
