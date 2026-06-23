/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Resident {
  residentId: string;
  flatNumber: string; // e.g., "101", "204", "Shop 1"
  wing: string;        // e.g., "A", "B", "Commercial"
  ownerName: string;
  tenantName?: string;
  mobile: string;
  email: string;
  occupancyType: 'Owner' | 'Tenant';
  monthlyMaintenance: number; // default ₹200
  outstandingBalance: number;
  status: 'Active' | 'Inactive';
}

export interface Payment {
  paymentId: string;
  residentId: string;
  flatNumber: string;
  residentName: string;
  month: string;              // e.g., "July 2026", "June 2026"
  amount: number;
  transactionId: string;
  paymentDate: string;        // ISO string or YYYY-MM-DD
  screenshot: string;         // base64 image
  status: 'Pending Verification' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  updatedAt?: string;
}

export interface Receipt {
  receiptNumber: string;      // GH-YYYY-MM-0001
  paymentId: string;
  flatNumber: string;
  residentName: string;
  amount: number;
  transactionId: string;
  paymentDate: string;
  verificationDate: string;
}

export interface Complaint {
  complaintId: string;
  flatNumber: string;
  residentName: string;
  category: 'Water Issue' | 'Lift Issue' | 'Parking Issue' | 'Security Issue' | 'Electricity Issue' | 'Other';
  title: string;
  description: string;
  photo?: string;             // base64 image or optional placeholder
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  createdDate: string;        // ISO string
  updatedAt: string;          // ISO string
}

export interface Notice {
  noticeId: string;
  title: string;
  description: string;
  date: string;              // ISO string or Date string
  attachment?: string;        // optional custom file or notes
  createdBy: string;         // e.g., "Secretary", "Chairman"
}

export interface ReminderLog {
  logId: string;
  action: string;             // e.g., "1st of Month - Maintenance Generated"
  recipient: string;          // e.g., "All Unpaid", "Flat A-101"
  date: string;
  details: string;
}

export interface CommitteeContact {
  role: string;               // e.g., "Chairman"
  name: string;
  phone: string;
  email: string;
}
