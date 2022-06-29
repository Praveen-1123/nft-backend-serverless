let CONFIG = {}

CONFIG.region = process.env.REGION || 'us-west-2'
CONFIG.accessKeyId = process.env.AWS_ACCESSKEY || 'aws-access-key'
CONFIG.secretAccessKey = process.env.AWS_SECRETKEY || 'aws-secret-key'
CONFIG.bucket_name = process.env.AWS_BUCKETNAME || 'marketplace-nft'

CONFIG.network = process.env.NETWORK || 'rinkeby'
CONFIG.infura_key = process.env.INFURA_KEY || '5be49379f1274393870cd0f1affc7302'
CONFIG.rinkeby_rpc = process.env.RINKEBY_RPC || 'https://rinkeby.infura.io/v3/2f70767d7c0348e8a34fec6c18c5f198'

CONFIG.nft_contract_721 = process.env.NFT_CONTRACT_721 || '0xA1B6c6279D5876DbD55D671de57b8f71215d62c4'
CONFIG.nft_contract_1155 = process.env.NFT_CONTRACT_1155 || '0x4afF8B55354598c4D603e534b48a6347BA4E2B61'
CONFIG.market_contract_721 = process.env.MARKET_CONTRACT_721 || '0x93a9491bC79ABea46961B702E5Aa18f1918a5D72'
CONFIG.market_contract_1155 = process.env.MARKET_CONTRACT_1155 || '0x109aD35D9cE6C3298c8076011D0b839fF705EC11'

CONFIG.userPopulatable = ['id', 'userName', 'walletAddress', 'walletSeed', 'email', 'imageUrl', 'gender', 'about', 'profession', 'firstName', 'lastName', 'followers', 'followings', 'private', 'social']

module.exports = CONFIG