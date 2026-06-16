const config = require('../services/config');

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}

function requireAdminOrServiceFormation(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  if (req.user && config.isServiceFormation(req.user.email)) return next();
  return res.status(403).json({ error: 'Accès réservé aux administrateurs ou au service formation' });
}

module.exports = { requireAdmin, requireAdminOrServiceFormation };
