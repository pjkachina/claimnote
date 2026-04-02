// scripts/seed-data.ts
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'localhost',
  projectId: 'demo-claimnote',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
connectFirestoreEmulator(db, 'localhost', 8080);

const testUser = {
  email: 'test@claimnote.app',
  password: 'TestClaim123!',
};

const sampleClaims = [
  {
    tenantName: '山田太郎 101号室',
    category: 'water',
    priority: 'urgent',
    content: '洗面台の水漏れがひどいです。至急対応お願いします。',
    status: 'pending',
  },
  {
    tenantName: '佐藤花子 205号室',
    category: 'equipment',
    priority: 'normal',
    content: 'エアコンの効きが悪くなりました。フィルター掃除をお願いできますか。',
    status: 'in_progress',
  },
  {
    tenantName: '鈴木一郎 302号室',
    category: 'noise',
    priority: 'high',
    content: '上の階の足音がうるさいです。対応をお願いします。',
    status: 'completed',
  },
  {
    tenantName: '田中美咲 103号室',
    category: 'electric',
    priority: 'normal',
    content: '玄関の電球が切れました。交換お願いします。',
    status: 'pending',
  },
  {
    tenantName: '高橋健太 401号室',
    category: 'other',
    priority: 'low',
    content: '壁に小さな傷があります。次回点検時に見ていただけますか。',
    status: 'pending',
  },
];

async function seedData() {
  try {
    // Create or sign in test user
    let user;
    try {
      const userCred = await createUserWithEmailAndPassword(auth, testUser.email, testUser.password);
      user = userCred.user;
      console.log('Created test user:', user.uid);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        const userCred = await signInWithEmailAndPassword(auth, testUser.email, testUser.password);
        user = userCred.user;
        console.log('Signed in test user:', user.uid);
      } else {
        throw error;
      }
    }

    // Add sample claims
    for (const claim of sampleClaims) {
      await addDoc(collection(db, 'users', user.uid, 'claims'), {
        ...claim,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log('Seeded 5 sample claims');
    console.log('Test user:', testUser.email);
    console.log('Password:', testUser.password);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
