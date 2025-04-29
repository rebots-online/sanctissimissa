declare namespace jest {
  interface Mock<T = any> {
    new (...args: any[]): T;
    (...args: any[]): any;
    mockClear(): void;
    mockReset(): void;
    mockImplementation(fn: (...args: any[]) => any): Mock<T>;
    mockReturnValue(value: any): Mock<T>;
    mockResolvedValue(value: any): Mock<T>;
    mockRejectedValue(value: any): Mock<T>;
  }

  interface Expect {
    objectContaining<T = any>(obj: Partial<T>): T;
  }

  interface ExpectStatic extends Expect {
    (actual: any): Matchers<void>;
  }

  interface Matchers<R> {
    toBeTruthy(): R;
    toBeNull(): R;
    toHaveBeenCalled(): R;
    toHaveBeenCalledWith(...args: any[]): R;
    toContainEqual(expected: any): R;
  }

  interface JestGlobal {
    fn(): Mock;
    spyOn(obj: any, method: string): Mock;
    mock(moduleName: string, factory?: () => any): void;
    clearAllMocks(): void;
    resetAllMocks(): void;
    restoreAllMocks(): void;
  }
}

declare global {
  const jest: jest.JestGlobal;
  const expect: jest.ExpectStatic;
  function describe(name: string, fn: () => void): void;
  function beforeEach(fn: () => void): void;
  function it(name: string, fn: () => void | Promise<void>): void;
}