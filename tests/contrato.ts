import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';
import { expect } from 'vitest';

/**
 * Contrato da API (backend/contrato/openapi.yaml) carregado no ajv (OpenAPI 3.1 = JSON Schema
 * 2020-12). O documento inteiro é registrado como "openapi", para os $ref internos resolverem.
 */
export type Metodo = 'get' | 'post';
export interface Operacao {
  responses: Record<string, { $ref?: string; content?: Record<string, unknown> }>;
}
export const doc = parse(readFileSync(resolve(import.meta.dirname, '../../backend/contrato/openapi.yaml'), 'utf8')) as {
  paths: Record<string, Partial<Record<Metodo, Operacao>>>;
  components: { responses: Record<string, { content?: Record<string, unknown> }> };
};

export const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(doc as object, 'openapi');

export const ENTRADA_LOGIN = 'openapi#/paths/~1auth~1login/post/requestBody/content/application~1json/schema';
export const ENTRADA_VENDA = 'openapi#/components/schemas/VendaEntrada';

/** Falha o teste se o corpo não seguir o schema de entrada indicado. */
export function validarEntrada(schema: string, corpo: unknown): void {
  const v = ajv.getSchema(schema);
  expect(v, schema).toBeTypeOf('function');
  expect(v!(corpo), `${schema}: ${ajv.errorsText(v!.errors)}\ncorpo: ${JSON.stringify(corpo)}`).toBe(true);
}
