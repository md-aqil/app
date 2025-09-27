// UserSession model for managing conversational states
class UserSession {
  constructor(db, phoneNumber) {
    this.db = db;
    this.phoneNumber = phoneNumber.replace(/\D/g, ''); // Remove all non-digit characters
    this.collectionName = 'user_sessions';
  }

  // Get session data
  async get() {
    const session = await this.db.collection(this.collectionName).findOne({ 
      phoneNumber: this.phoneNumber 
    });
    
    if (!session) {
      return null;
    }
    
    // Check if session has expired
    const now = new Date().getTime();
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 15 * 60 * 1000; // 15 minutes default
    
    if (now - new Date(session.lastActivity).getTime() > sessionTimeout) {
      // Session expired, delete it
      await this.db.collection(this.collectionName).deleteOne({ 
        phoneNumber: this.phoneNumber 
      });
      return null;
    }
    
    return session;
  }

  // Create or update session
  async set(data) {
    const sessionData = {
      ...data,
      phoneNumber: this.phoneNumber,
      lastActivity: new Date(),
      updatedAt: new Date()
    };

    await this.db.collection(this.collectionName).updateOne(
      { phoneNumber: this.phoneNumber },
      { $set: sessionData },
      { upsert: true }
    );

    return sessionData;
  }

  // Update specific fields in session
  async update(updates) {
    const sessionData = {
      ...updates,
      lastActivity: new Date(),
      updatedAt: new Date()
    };

    await this.db.collection(this.collectionName).updateOne(
      { phoneNumber: this.phoneNumber },
      { $set: sessionData }
    );

    return sessionData;
  }

  // Delete session
  async delete() {
    await this.db.collection(this.collectionName).deleteOne({ 
      phoneNumber: this.phoneNumber 
    });
  }

  // Check if session exists and is active
  async exists() {
    const session = await this.get();
    return !!session;
  }

  // Extend session timeout
  async extend() {
    await this.db.collection(this.collectionName).updateOne(
      { phoneNumber: this.phoneNumber },
      { $set: { lastActivity: new Date() } }
    );
  }
}

module.exports = UserSession;