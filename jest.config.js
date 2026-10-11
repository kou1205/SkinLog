/** ロジック層のユニットテスト用（UIを含まないため ts-jest で実行） */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, types: ['jest', 'node'] } }] },
};
