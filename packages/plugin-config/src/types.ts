/** 萌兔 Agent/srcGet 表单字段 */
export interface SrcGetFormField {
  type: string;
  label?: string;
  name: string;
  value?: string | boolean | number;
  placeholder?: string;
}

export interface SrcGetResponse {
  status?: number;
  data?: {
    title?: string;
    form?: SrcGetFormField[];
  };
}

export type FormValues = Record<string, string | boolean | number | undefined>;

export interface MengtuOpConfig {
  op: string;
  enabled: boolean;
  values: FormValues;
}
