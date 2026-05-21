const { User, Waba, Phone, Verification } = require('../models/index');

module.exports = {
  async upsertUser(user) {
    return User.findOneAndUpdate(
      { _id: user.id },
      { $set: { ...user, _id: user.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  },
  async getUser(id) {
    const doc = await User.findById(id).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  },
  async listAllUsers() {
    const docs = await User.find().lean();
    return docs.map((d) => ({ ...d, id: d._id }));
  },
  async upsertWaba(waba) {
    return Waba.findOneAndUpdate(
      { _id: waba.id },
      { $set: { ...waba, _id: waba.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  },
  async upsertPhone(phone) {
    return Phone.findOneAndUpdate(
      { _id: phone.id },
      { $set: { ...phone, _id: phone.id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  },
  async getPhone(id) {
    const doc = await Phone.findById(id).lean();
    if (!doc) return null;
    return { ...doc, id: doc._id };
  },
  async listPhonesByUser(userId) {
    const docs = await Phone.find({ userId }).lean();
    return docs.map((d) => ({ ...d, id: d._id }));
  },
  async upsertVerification(businessId, patch) {
    const doc = await Verification.findOneAndUpdate(
      { _id: businessId },
      { $set: { ...patch, _id: businessId, updatedAt: Date.now() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return { ...doc, businessId: doc._id };
  },
  async getVerification(businessId) {
    const doc = await Verification.findById(businessId).lean();
    if (!doc) return null;
    return { ...doc, businessId: doc._id };
  },
};
