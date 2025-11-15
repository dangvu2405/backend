// Jest setup file
require('dotenv').config({ path: '.env.test' });

// Mock console để giảm noise trong test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};



















