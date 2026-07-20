const sessions = new Map();

// Session timeout: 30 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000;

function getSession(phone) {
  const now = Date.now();
  if (sessions.has(phone)) {
    const session = sessions.get(phone);
    if (now - session.lastActive > SESSION_TIMEOUT) {
      // Session expired, clear it
      sessions.delete(phone);
      return createSession(phone);
    }
    session.lastActive = now;
    return session;
  }
  return createSession(phone);
}

function createSession(phone) {
  const session = {
    phone,
    step: 'WELCOME',
    selectedGrade: null,
    selectedBook: null,
    lastActive: Date.now()
  };
  sessions.set(phone, session);
  return session;
}

function updateSession(phone, updates) {
  const session = getSession(phone);
  Object.assign(session, updates, { lastActive: Date.now() });
  return session;
}

function clearSession(phone) {
  sessions.delete(phone);
}

module.exports = {
  getSession,
  updateSession,
  clearSession
};
