const router = require('express').Router();
const c = require('../controllers/specialty.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
router.use(authenticate);
router.get('/', c.getAll);
router.post('/', authorize('admin'), c.create);
router.put('/:id', authorize('admin'), c.update);
router.delete('/:id', authorize('admin'), c.remove);
module.exports = router;
