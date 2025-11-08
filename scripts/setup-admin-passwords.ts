#!/usr/bin/env ts-node

import bcrypt from 'bcryptjs';

/**
 * Script to hash admin passwords for secure storage
 * Run this script to generate hashed passwords for admin credentials
 */

const SALT_ROUNDS = 12;

const adminPasswords = [
  {
    email: 'admin@goip.com',
    plainPassword: 'admin123',
    name: 'Administrator',
    role: 'super_admin'
  },
  {
    email: 'superadmin@goip.com',
    plainPassword: 'admin123',
    name: 'Super Administrator',
    role: 'super_admin'
  }
];

async function hashPasswords() {
  console.log('🔐 Generating hashed passwords for admin accounts...\n');

  for (const admin of adminPasswords) {
    try {
      const hashedPassword = await bcrypt.hash(admin.plainPassword, SALT_ROUNDS);

      console.log('📧 Admin Account:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Plain Password: ${admin.plainPassword}`);
      console.log(`   Hashed Password: ${hashedPassword}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Role: ${admin.role}`);
      console.log('---');
    } catch (error) {
      console.error(`❌ Error hashing password for ${admin.email}:`, error);
    }
  }

  console.log('\n✅ Password hashing complete!');
  console.log('\n📋 Copy these credentials to your ADMIN_CREDENTIALS array in:');
  console.log('   src/app/api/admin/auth/login/route.ts');
  console.log('\n🔒 Important: Store the hashed passwords, not the plain ones!');
}

// Run the script
if (require.main === module) {
  hashPasswords().catch(console.error);
}

export { hashPasswords };