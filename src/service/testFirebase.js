// Simple Firebase connection test
import { db } from './firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    
    // Try to write a test document
    const testDoc = doc(db, 'test', 'connection');
    await setDoc(testDoc, {
      message: 'Hello Firebase!',
      timestamp: new Date().toISOString()
    });
    
    // Try to read it back
    const docSnap = await getDoc(testDoc);
    
    if (docSnap.exists()) {
      console.log('✅ Firebase connection successful!', docSnap.data());
      return true;
    } else {
      console.log('❌ Document not found after write');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};

// Call this function to test
// testFirebaseConnection();
