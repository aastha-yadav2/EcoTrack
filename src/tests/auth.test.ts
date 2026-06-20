import { describe, it, expect, vi } from 'vitest';
import { getAuth, signInWithPopup, signOut } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../firebase';

describe('Authentication state and Firestore Custom Error Handling test suite', () => {
  it('should successfully mock and return current user details using mocked Firebase auth', () => {
    const auth = getAuth();
    expect(auth.currentUser).not.toBeNull();
    expect(auth.currentUser?.uid).toBe('test-user-123');
    expect(auth.currentUser?.email).toBe('test@example.com');
    expect(auth.currentUser?.displayName).toBe('Eco Tracker');
  });

  it('should resolve signInWithPopup with mock credentials', async () => {
    const result = await signInWithPopup({} as any, {} as any);
    expect(result.user.uid).toBe('test-user-123');
    expect(result.user.displayName).toBe('Eco Tracker');
  });

  it('should resolve signOut without throwing errors', async () => {
    await expect(signOut({} as any)).resolves.not.toThrow();
  });

  it('should correctly format and throw Firestore details in handleFirestoreError helper', () => {
    const mockError = new Error('Permission denied at server-side security rule');
    const path = 'users/test-user-123/logs';

    try {
      handleFirestoreError(mockError, OperationType.WRITE, path);
      // If no error is thrown, make the test fail
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(Error);
      
      const parsedObj = JSON.parse(err.message);
      expect(parsedObj.error).toContain('Permission denied');
      expect(parsedObj.operationType).toBe('write');
      expect(parsedObj.path).toBe(path);
      expect(parsedObj.authInfo.userId).toBe('test-user-123');
      expect(parsedObj.authInfo.email).toBe('test@example.com');
    }
  });
});
