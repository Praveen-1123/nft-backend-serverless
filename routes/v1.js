const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/verify')
const ContractController = require('../controller/contract.controller')

router.post('/mint',
	verifyToken,
	ContractController.mint
);
router.post('/putonsale',
	verifyToken,
	ContractController.putOnSale
);
router.post('/buy',
	verifyToken,
	ContractController.buyNft
);
router.post('/updateprice',
	verifyToken,
	ContractController.updatePrice
);
router.post('/burn',
	verifyToken,
	ContractController.burnNft
);

router.use('/', (req, res, next) => {
	var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

	res.status(200).send({ 'message': 'Welcome to NFT Marketplace', 'hostname': fullUrl });
	return
});

module.exports = router;