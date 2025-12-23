import { Router } from 'express';
import type { RequestHandler } from 'express';
import { prisma } from "../config/prisma.js";

const router = Router();

const getWallets: RequestHandler = async (_req, res) => {
    const wallets = await prisma.wallet.findMany({});
    res.json(wallets);
};

const getWalletByAddress: RequestHandler = async (req, res) => {
    const { address } = req.params;
    if (!address) {
        return res.status(400).json({ error: 'Address parameter is required' });
    }

    const wallet = await prisma.wallet.findFirst({
        where: { solAddress: address },
        include: { signatures: true }
    });

    if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json(wallet);
};

const getWalletSignatures: RequestHandler = async (req, res) => {
    const address = req.params.address;
    if (!address) {
        return res.status(400).json({ error: 'Address parameter is required' });
    }

    const { limit, offset } = req.query;

    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;

    if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json({ error: 'Invalid offset parameter' });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({ error: 'Invalid limit parameter (must be 1-100)' });
    }

    const sigs = await prisma.signatures.findMany({
        where: {
            wallet: { solAddress: address }
        },
        orderBy: {
            slot: 'desc'
        },
        take: limitNum,
        skip: offsetNum,
    });

    res.json(sigs);
};

router.get('/v1/wallets', getWallets);
router.get('/v1/wallets/:address', getWalletByAddress);
router.get('/v1/wallets/:address/signatures', getWalletSignatures);

export default router;