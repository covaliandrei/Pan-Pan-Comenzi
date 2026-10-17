/**
 * Strips any undefined fields from an object so Firestore setDoc/updateDoc/addDoc never throws:
 * "Unsupported field value: undefined"
 */
export function cleanFirestorePayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanFirestorePayload(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as Partial<T>;
}
