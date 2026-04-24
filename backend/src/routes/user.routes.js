const router = require('express').Router();
const c = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
router.use(authenticate, authorize('admin'));
router.get('/', c.getAll);
router.post('/', c.create);
router.patch('/:id/toggle-active', c.toggleActive);
module.exports = router;
