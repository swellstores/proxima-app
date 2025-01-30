import * as fs from 'node:fs';
import { pathsToModuleNameMapper } from 'ts-jest';

const tsconfig = JSON.parse(
  fs.readFileSync('./frontend/tsconfig.json', { encoding: 'utf8' }),
);

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  clearMocks: true,
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths),
  modulePaths: [tsconfig.compilerOptions.baseUrl],
  restoreMocks: true,
  roots: ['<rootDir>/frontend/src'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': ['esbuild-jest', { sourcemap: true }],
  },
  transformIgnorePatterns: ['/node_modules/(?!lodash-es)/'],
};
