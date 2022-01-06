const { Router } = require('express');
const db = require('../functions/db');

const router = Router();

router.get('/', async (req, res) => {
    const users = await db.getAllAccounts();
    return res.json({ status: 'success', users });
});

router.get('/:id', async (req, res) => {
    if (!req.params.id) return res.status(400).json({
        status: 'error',
        message: 'missing parameter id'
    });

    const data = await db.fetchAccount(req.params.id);
    if (!data) return res.status(404).json({
        status: 'error',
        message: 'user not found'
    });

    return res.json({ status: 'success', data });
});

module.exports = router;
