import {ApiError} from './quotes.mjs';
export const APPROVER='michel@shedhouse.co.nz';
const STAFF=new Set([APPROVER,'michael@shedhouse.co.nz']);
export function requireStaff(user){if(!user?.userId||!STAFF.has(user.email?.toLowerCase()))throw new ApiError(403,'This endpoint is restricted to SH pricing staff.');return user;}
export function requireApprover(user){requireStaff(user);if(user.email.toLowerCase()!==APPROVER)throw new ApiError(403,'Only michel@shedhouse.co.nz can approve pricing or publish rates.');return user;}
