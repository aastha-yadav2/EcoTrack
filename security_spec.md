# Security Specifications & Data Invariants for EcoTrack

This specification outlines the data invariants, threat metrics, and security rules for securing the EcoTrack Firestore database.

## 1. Data Invariants

- **User Ownership Isolation**: Users should only be able to view, create, modify, or delete their own data under the path `/users/{userId}/**`. No user should be able to touch or read another user's activity logs, goals, or profile.
- **Strict Key Adherence**: Payloads containing keys outside of the defined schemas must be rejected.
- **Identity Consistency**: Any fields referencing owner UIDs must strictly match `request.auth.uid`.
- **Verified Status**: Standard writes require that the user's email is verified (`request.auth.token.email_verified == true`).
- **Temporal Trust**: All updates and insertions of timestamp properties (`timestamp` or `unlockedAt`) must be strictly compared with the server time or handled securely to prevent client timing fraud.

## 2. The "Dirty Dozen" Rogue Payloads

The following payloads represent illegal database states or malicious write actions (e.g., trying to write other users' data, injecting rogue types/huge values, or bypassing key rules):

1. **Spoofed User Creation**: Creating or editing another user's profile where the matched `userId` in the path does not match `request.auth.uid`.
2. **Shadow Field Injection**: Writing an activity with unapproved properties like `{"isVerified": true}`.
3. **Ghost Activity Log**: Inserting an activity under another user's subcollection path.
4. **Invalid Activity Category**: Writing an activity with a category like `"crypto-mining"`.
5. **Negative Carbon Amount**: Logging a negative emissions amount (`-500 kg`) to artificially reduce total emissions.
6. **Non-Numeric value**: Providing a string value for `value` or `carbonAmount` fields.
7. **Bypassing Verification**: Writing data with `request.auth.token.email_verified = false`.
8. **Goal Deadline Clock Cheat**: Modifying the deadline of a goal in past dates or invalid formats.
9. **Artificially Unlocking Badges**: Overwriting a badge doc with a custom unlocked date without solving the required goal.
10. **Huge Value Injection**: Setting a streak of `999999999` to flood lead boards or inflate rewards.
11. **Altering Immutable Profile ID**: Attempting to alter the `userId` of an existing profile.
12. **Bypassing the List Filter Gate**: Performing a wide list query without checking user ownership.

## 3. Test Cases Configuration

The test scenarios will ensure that the Firestore security system actively rejects all "Dirty Dozen" rogue requests using the designed ruleset.
