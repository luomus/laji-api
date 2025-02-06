import "jsonld";

declare module "jsonld" {
  export interface DocumentLoaderResponse {
    contextUrl: string | null;
    documentUrl: string;
    document: JsonLdDocument;
  }

  export type DocumentLoader = (url: string) => Promise<DocumentLoaderResponse>;

  export function expand(input: any, options?: { documentLoader?: DocumentLoader }): Promise<any>;

  export const documentLoader: DocumentLoader;
}
