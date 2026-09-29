import type { ClientSession } from 'mongoose';

/**
 * A `ClientSession` stand-in for specs whose repositories are mocks.
 *
 * It runs the callback once and commits nothing, because there is nothing to
 * commit: such a spec is asserting what the service asks its collaborators to
 * do, in what order. Whether the writes actually roll back together is a
 * property of the server and is asserted against a real replica set instead.
 */
export const fakeSession = (): ClientSession =>
  ({
    withTransaction: async <T>(run: () => Promise<T>): Promise<T> => run(),
    endSession: async (): Promise<void> => {},
  }) as unknown as ClientSession;
