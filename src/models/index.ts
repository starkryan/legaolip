// Import and re-export mongoose for convenience
import mongoose from 'mongoose';
export { mongoose };

// Export all MongoDB models
export { Device } from './Device';
export { PhoneNumber } from './PhoneNumber';
export { SmsMessage } from './SmsMessage';
export { SmsForwarding } from './SmsForwarding';
export { Message } from './Message';
export { SmsForwardingConfig } from './SmsForwardingConfig';
export { Transaction, TransactionType, TransactionStatus } from './Transaction';
export { WithdrawalRequest, WithdrawalStatus } from './WithdrawalRequest';
export type { IBankDetails } from './WithdrawalRequest';
export { UserAccount, UserAccountStatus } from './UserAccount';

// Export interfaces (these need to be imported properly)
export type { IDevice } from './Device';
export type { IPhoneNumber } from './PhoneNumber';
export type { ISmsMessage } from './SmsMessage';
export type { ISmsForwarding } from './SmsForwarding';
export type { IMessage } from './Message';
export type { ISmsForwardingConfig } from './SmsForwardingConfig';
export type { ITransaction } from './Transaction';
export type { IWithdrawalRequest } from './WithdrawalRequest';
export type { IUserAccount } from './UserAccount';