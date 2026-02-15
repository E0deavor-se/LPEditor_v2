export type AiRewriteRequest = {
  text: string;
  instruction: string;
  context?: {
    sectionType?: string;
    fieldKey?: string;
    fieldLabel?: string;
  };
};

export type AiRewriteResponse = {
  text: string;
};

export interface AiProvider {
  rewrite(request: AiRewriteRequest): Promise<AiRewriteResponse>;
}
