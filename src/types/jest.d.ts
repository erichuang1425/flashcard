declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function expect(value: any): any;

declare namespace jest {
  interface Mock<T = any> extends Function {}
  function fn<T = any>(impl?: (...args: any[]) => T): Mock<T>;
}
