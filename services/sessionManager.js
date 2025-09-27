// Session Manager Service
const UserSession = require('../models/UserSession');

class SessionManager {
  constructor(db) {
    this.db = db;
  }

  // Get session for a user
  async getSession(phoneNumber) {
    const session = new UserSession(this.db, phoneNumber);
    return await session.get();
  }

  // Create or update session for a user
  async setSession(phoneNumber, data) {
    const session = new UserSession(this.db, phoneNumber);
    return await session.set(data);
  }

  // Update session for a user
  async updateSession(phoneNumber, updates) {
    const session = new UserSession(this.db, phoneNumber);
    return await session.update(updates);
  }

  // Delete session for a user
  async deleteSession(phoneNumber) {
    const session = new UserSession(this.db, phoneNumber);
    return await session.delete();
  }

  // Check if session exists for a user
  async sessionExists(phoneNumber) {
    const session = new UserSession(this.db, phoneNumber);
    return await session.exists();
  }

  // Extend session timeout for a user
  async extendSession(phoneNumber) {
    const session = new UserSession(this.db, phoneNumber);
    return await session.extend();
  }

  // Get all active sessions
  async getActiveSessions() {
    const now = new Date().getTime();
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 15 * 60 * 1000; // 15 minutes default
    const cutoffTime = new Date(now - sessionTimeout);

    return await this.db.collection('user_sessions').find({
      lastActivity: { $gte: cutoffTime }
    }).toArray();
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    const now = new Date().getTime();
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 15 * 60 * 1000; // 15 minutes default
    const cutoffTime = new Date(now - sessionTimeout);

    const result = await this.db.collection('user_sessions').deleteMany({
      lastActivity: { $lt: cutoffTime }
    });

    return result.deletedCount;
  }

  // Get session state for a user
  async getSessionState(phoneNumber) {
    const session = await this.getSession(phoneNumber);
    return session ? session.state : null;
  }

  // Set session state for a user
  async setSessionState(phoneNumber, state, additionalData = {}) {
    return await this.setSession(phoneNumber, {
      state,
      ...additionalData
    });
  }
}

module.exports = SessionManager;