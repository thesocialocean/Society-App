/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Resident, Payment, Receipt, Complaint, Notice, ReminderLog } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

// Error handling types and helpers as required by skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connection Successfully Verified.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

// Initial seed helper to populate 16 representative slots quickly and reliably
export async function seedInitialDataIfNecessary() {
  const residentsPath = 'residents';
  try {
    const querySnapshot = await getDocs(collection(db, residentsPath));
    if (querySnapshot.empty) {
      console.log("Residents list empty. Instantiating initial compact seed data (16 flats/shops)...");

      const seedResidents: Resident[] = [];
      
      // Seed A-Wing Residents
      const aFlats = ['101', '102', '201', '202', '301', '501'];
      const aNames = ['Anil Deshmukh', 'Shashi Joshi', 'Sunil Patil', 'Kavit Shah', 'Vijay Kulkarni', 'Anand Awasthi'];
      const aMobiles = ['9822011110', '9822011120', '9822012110', '9822012120', '9822013110', '9822015110'];
      const aBalances = [400, 0, 200, 0, 400, 0];
      const aTenants = ['', '', '', '', 'Ramesh Kumar', 'Vinay Sharma'];

      for (let i = 0; i < aFlats.length; i++) {
        seedResidents.push({
          residentId: `RES-A-${aFlats[i]}`,
          flatNumber: aFlats[i],
          wing: 'A',
          ownerName: aNames[i],
          tenantName: aTenants[i],
          mobile: aMobiles[i],
          email: `a${aFlats[i]}@gafoorheights.com`,
          occupancyType: aTenants[i] ? 'Tenant' : 'Owner',
          monthlyMaintenance: 200,
          outstandingBalance: aBalances[i],
          status: 'Active'
        });
      }

      // Seed B-Wing Residents
      const bFlats = ['101', '102', '201', '202', '301', '501'];
      const bNames = ['Bharat Patil', 'Devendra Shinde', 'Nitin Deshmukh', 'Kishore Joshi', 'Sandeep Joshi', 'Rajesh Awasthi'];
      const bMobiles = ['9822021110', '9822021120', '9822022110', '9822022120', '9822023110', '9822025110'];
      const bBalances = [0, 200, 0, 0, 200, 400];
      const bTenants = ['', '', '', '', 'Suresh Singh', 'Ravi Kumar'];

      for (let i = 0; i < bFlats.length; i++) {
        seedResidents.push({
          residentId: `RES-B-${bFlats[i]}`,
          flatNumber: bFlats[i],
          wing: 'B',
          ownerName: bNames[i],
          tenantName: bTenants[i],
          mobile: bMobiles[i],
          email: `b${bFlats[i]}@gafoorheights.com`,
          occupancyType: bTenants[i] ? 'Tenant' : 'Owner',
          monthlyMaintenance: 200,
          outstandingBalance: bBalances[i],
          status: 'Active'
        });
      }

      // Seed 4 Commercial Shops in "Commercial" Wing
      for (let s = 1; s <= 4; s++) {
        const mobile = `982203000${s}`;
        const names = ['Gafoor Bakery', 'Pune Pharmacy', 'City Supermarket', 'Laundry Express'];
        const outstandingBalance = s % 2 === 0 ? 200 : 0;
        seedResidents.push({
          residentId: `RES-COMM-S${s}`,
          flatNumber: `Shop ${s}`,
          wing: 'Commercial',
          ownerName: names[s - 1],
          mobile,
          email: `shop${s}@gafoorheights.com`,
          occupancyType: 'Owner',
          monthlyMaintenance: 200,
          outstandingBalance,
          status: 'Active'
        });
      }

      // Write them incrementally
      for (const res of seedResidents) {
        await setDoc(doc(db, residentsPath, res.residentId), res);
      }

      // Add a couple of initial notices
      const noticesPath = 'notices';
      const sampleNotices: Notice[] = [
        {
          noticeId: 'notice-1',
          title: 'Upcoming Annual General Body Meeting (AGM) 2026',
          description: 'Dear Residents, The AGM is scheduled for next Sunday, June 28, 2026 at 10:00 AM in the Society Club House. Agenda: Financial budget audit approval and Phase 2 Security upgrade approvals. Attendance is compulsory.',
          date: '2026-06-20T10:00:00.000Z',
          createdBy: 'Chairman (Mr. Ravindra Dixit)'
        },
        {
          noticeId: 'notice-2',
          title: 'Scheduled Water Supply Interruption',
          description: 'Water overhead tanks cleaning scheduled for Thursday, June 25, 2026. Water supply will be unavailable from 10:00 AM to 4:00 PM. Please store sufficient water.',
          date: '2026-06-21T09:00:00.000Z',
          createdBy: 'Secretary (Mr. Sandeep Patil)'
        }
      ];

      for (const notice of sampleNotices) {
        await setDoc(doc(db, noticesPath, notice.noticeId), notice);
      }

      // Add a sample complaint
      const complaintsPath = 'complaints';
      const sampleComplaint: Complaint = {
        complaintId: 'complaint-1',
        flatNumber: 'A-201',
        residentName: 'Anil Kulkarni',
        category: 'Water Issue',
        title: 'Low pressure water supply in kitchen water purifier inlet',
        description: 'Since yesterday, kitchen water pressure has been very low. Requesting plumber check as soon as possible.',
        status: 'Open',
        createdDate: '2026-06-21T14:30:00.000Z',
        updatedAt: '2026-06-21T14:30:00.000Z'
      };

      await setDoc(doc(db, complaintsPath, sampleComplaint.complaintId), sampleComplaint);

      console.log("Successfully seeded Gafoor Heights standard database records.");
    }
  } catch (error) {
    console.error("Error seeding initial data: ", error);
  }
}
