import { expect, jest } from '@jest/globals';

// Make Jest's expect and jest available globally
(global as any).expect = expect;
(global as any).jest = jest;