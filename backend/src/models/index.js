const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ── User ── */
const userSchema = new Schema({
  _id: String,
  name: String,
  email: String,
  fbToken: String,
  tokenExpiresIn: Number,
  wabaIds: [String],
  businessIds: [String],
  signupSession: Schema.Types.Mixed,
  createdAt: Number,
}, { _id: false });

/* ── WABA ── */
const wabaSchema = new Schema({
  _id: String,
  userId: String,
  phones: Schema.Types.Mixed,
}, { _id: false });

/* ── Phone ── */
const phoneSchema = new Schema({
  _id: String,
  wabaId: String,
  userId: String,
  display_phone_number: String,
  verified_name: String,
  name_status: String,
  code_verification_status: String,
  status: String,
  review_path: String,
  updatedAt: Number,
}, { _id: false });

/* ── Verification ── */
const verificationSchema = new Schema({
  _id: String,
  businessId: String,
  docsUploaded: Boolean,
  msmeSetId: String,
  bankSetId: String,
  msmeFileName: String,
  bankFileName: String,
  emailSentTo: String,
  emailVerified: Boolean,
  verifiedEmail: String,
  submitted: Boolean,
  submittedAt: Number,
  updatedAt: Number,
}, { _id: false });

const User         = mongoose.models.User         || mongoose.model('User',         userSchema);
const Waba         = mongoose.models.Waba         || mongoose.model('Waba',         wabaSchema);
const Phone        = mongoose.models.Phone        || mongoose.model('Phone',        phoneSchema);
const Verification = mongoose.models.Verification || mongoose.model('Verification', verificationSchema);

module.exports = { User, Waba, Phone, Verification };
