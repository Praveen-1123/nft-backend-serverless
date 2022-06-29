// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";
contract MultiTokenMarket is Pausable, Ownable, AccessControlEnumerable {
    bytes32 public constant MARKET_ADMIN_ROLE = keccak256("MARKET_ADMIN_ROLE");
    struct MarketItem {
        address tokenAddress;
        uint256 tokenId;
        uint256 price;
        uint256 amount;
        address owner;
        bool tradable;
        // uint256 releaseTime;
        uint256 royalty;
    }
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIDs;
    Counters.Counter private _marketItemIDs;
    uint256 public platformFee = 3;
    uint256 public creatorFee = 5;
    address public platformAddress = 0x645BC5C30AF00160aED29bA42C5377Bd1e97892d;
    mapping(address => mapping(uint256 => mapping(uint256 => MarketItem)))
        public marketItems;
    mapping(uint256 => address) public creators;
    mapping(uint256 => uint256) public royalty;
    event TransferAsset(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    );
    event TokensCreated(address creator, address tokenAddress, uint256 tokenId);
    event TokensMinted(address tokenAddress, uint256 tokenId, uint256 amount);
    event TokensAddedForSale(
        address owner,
        address tokenAddress,
        uint256 tokenId,
        uint256 itemId,
        uint256 price,
        uint256 amount
    );
    event TokensSaleCancelled(
        address owner,
        address tokenAddress,
        uint256 tokenId,
        uint256 itemId
    );
    event SalePriceUpdated(
        address owner,
        address tokenAddress,
        uint256 tokenId,
        uint256 itemId
    );
    event TokensSold(
        address tokenAddress,
        uint256 tokenId,
        uint256 itemId,
        uint256 amount
    );
    event SetFees(address caller, uint256 platformFee, uint256 creatorFee);
    NFT1155 private nft;
    constructor(address _nftContractAddress) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MARKET_ADMIN_ROLE, _msgSender());
        nft = NFT1155(_nftContractAddress);
    }
    /**
     * @dev Require msg.sender to be the creator of the token id
     */
    modifier creatorOnly(uint256 _id) {
        require(
            creators[_id] == msg.sender,
            "MultiTokenMarket#creatorOnly: ONLY_CREATOR_ALLOWED"
        );
        _;
    }
    /**
     * @dev Throws if called by any account other than admins.
     */
    modifier adminOnly() {
        require(
            hasRole(MARKET_ADMIN_ROLE, _msgSender()),
            "MultiTokenMarket#adminOnly: must have market admin role"
        );
        _;
    }
    function createToken(
        uint256 _initialSupply,
        uint256 _tokenId,
        uint256 _royaltyFee
    ) public {
        //uint256 tokenId = _getNextTokenID();
        _tokenIDs.increment();
        nft.mint(msg.sender, _tokenId, _initialSupply, "");
        creators[_tokenId] = msg.sender;
        royalty[_tokenId] = _royaltyFee;
        address tokenAddress = address(nft);
        emit TokensCreated(msg.sender, tokenAddress, _tokenId);
    }
    function createSaleItem(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _price,
        uint256 _amount,
        uint256 _itemId
    ) public {
        require(
            NFT1155(_tokenAddress).balanceOf(msg.sender, _tokenId) >= _amount,
            "MultiTokenMarket: insufficient amount available"
        );
        //        uint256 itemId = _getNextMarketItemId();
        _marketItemIDs.increment();
        marketItems[_tokenAddress][_tokenId][_itemId].price = _price;
        marketItems[_tokenAddress][_tokenId][_itemId].amount = _amount;
        marketItems[_tokenAddress][_tokenId][_itemId].owner = msg.sender;
        marketItems[_tokenAddress][_tokenId][_itemId].tradable = true;
        emit TokensAddedForSale(
            msg.sender,
            _tokenAddress,
            _tokenId,
            _itemId,
            _price,
            _amount
        );
    }
    function cancelSale(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _itemId
    ) public {
        require(
            marketItems[_tokenAddress][_tokenId][_itemId].owner == msg.sender,
            "MultiTokenMarket: caller is not sale item owner"
        );
        marketItems[_tokenAddress][_tokenId][_itemId].tradable = false;
        emit TokensSaleCancelled(msg.sender, _tokenAddress, _tokenId, _itemId);
    }
    function updateSaleQuantity(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _itemId,
        uint256 _newAmount
    ) public {
        require(
            marketItems[_tokenAddress][_tokenId][_itemId].owner == msg.sender,
            "MultiTokenMarket: caller is not sale item owner"
        );
        marketItems[_tokenAddress][_tokenId][_itemId].amount = _newAmount;
    }
    function updateSalePrice(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _itemId,
        uint256 _newPrice
    ) public {
        require(
            marketItems[_tokenAddress][_tokenId][_itemId].owner == msg.sender,
            "MultiTokenMarket: caller is not sale item owner"
        );
        require(
            marketItems[_tokenAddress][_tokenId][_itemId].amount > 0,
            "MultiTokenMarket: cannot update price when quantity is 0"
        );
        marketItems[_tokenAddress][_tokenId][_itemId].price = _newPrice;
    }
    function getTokenPrice(
        address tokenAddress,
        uint256 tokenId,
        uint256 itemId
    ) public view returns (uint256) {
        return marketItems[tokenAddress][tokenId][itemId].price;
    }
    function fetchMarketItem(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _itemId
    ) public view returns (MarketItem memory) {
        return marketItems[_tokenAddress][_tokenId][_itemId];
    }
    function buyToken(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _itemId,
        uint256 _amount
    ) public payable {
        require(
            marketItems[_tokenAddress][_tokenId][_itemId].amount > 0,
            "MultiTokenMarket: item not in market."
        );
        require(
            marketItems[_tokenAddress][_tokenId][_itemId].tradable == true,
            "MultiTokenMarket: item not tradable."
        );
        require(
            marketItems[_tokenAddress][_tokenId][_itemId].owner != msg.sender,
            "MultiTokenMarket: cannot buy own tokens."
        );
        require(
            _amount <= marketItems[_tokenAddress][_tokenId][_itemId].amount,
            "MultiTokenMarket: amount unavailable to buy."
        );
        require(
            msg.value ==
                marketItems[_tokenAddress][_tokenId][_itemId].price * _amount,
            "Not enough eth sent."
        );
        NFT1155(_tokenAddress).safeTransferFrom(
            marketItems[_tokenAddress][_tokenId][_itemId].owner,
            msg.sender,
            _tokenId,
            _amount,
            ""
        );
        marketItems[_tokenAddress][_tokenId][_itemId].amount -= _amount;
        uint256 forCreator;
        if (royalty[_tokenId] == 0) {
            forCreator = (msg.value * creatorFee) / 100;
        } else {
            forCreator = (msg.value * royalty[_tokenId]) / 100;
        }
        //uint256 forCreator = (msg.value * creatorFee) / 100;
        uint256 forPlatform = (msg.value * platformFee) / 100;
        uint256 forOwner;
        if (_tokenAddress == address(nft)) {
            if (creators[_tokenId] != address(0)) {
                forOwner = msg.value - forCreator - forPlatform;
                payable(creators[_tokenId]).transfer(forPlatform);
            } else {
                forOwner = msg.value - forPlatform;
            }
        }
        payable(platformAddress).transfer(forPlatform);
        payable(marketItems[_tokenAddress][_tokenId][_itemId].owner).transfer(
            forOwner
        );
        emit TokensSold(_tokenAddress, _tokenId, _itemId, _amount);
    }
    function getRoyalty(uint256 tokenId) public view returns (uint256) {
        return royalty[tokenId];
    }
    function calculateFees(uint256 _priceValue, uint256 _tokenId)
        public
        view
        returns (
            uint256 creator,
            uint256 platform,
            uint256 owner
        )
    {
        uint256 forCreator;
        if (royalty[_tokenId] == 0) {
            forCreator = (_priceValue * creatorFee) / 100;
        } else {
            forCreator = (_priceValue * royalty[_tokenId]) / 100;
        }
        //uint256 forCreator = (_priceValue * creatorFee) / 100;
        uint256 forPlatform = (_priceValue * platformFee) / 100;
        return (
            forCreator,
            forPlatform,
            _priceValue - forCreator - forPlatform
        );
    }
    function setFees(uint256 _platformFee, uint256 _creatorFee)
        external
        adminOnly
    {
        platformFee = _platformFee;
        creatorFee = _creatorFee;
        emit SetFees(_msgSender(), _platformFee, _creatorFee);
    }
    function setPlatformAddress(address _platformAddress) external adminOnly {
        platformAddress = _platformAddress;
    }
    /**
     * @dev returns the current token ID counter value
     * @return uint256 for current next token ID
     */
    function getCurrentTokenID() public view returns (uint256) {
        return _tokenIDs.current();
    }
    /**
     * @dev returns the current market item ID counter value
     * @return uint256 for the current market item ID
     */
    function getCurrentMarketItemID() public view returns (uint256) {
        return _marketItemIDs.current();
    }
}
contract OwnableDelegateProxy {}
contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}
/**
 * @title NFT1155
 * NFT1155 - a contract for semi-fungible tokens.
 */
contract NFT1155 is ERC1155PresetMinterPauser, Ownable {
    address public proxyRegistryAddress;
    constructor(address _proxyRegistryAddress) ERC1155PresetMinterPauser("https://metaartii.s3.amazonaws.com/") {
        proxyRegistryAddress = _proxyRegistryAddress;
    }
    /**
     * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-free listings.
     */
    function isApprovedForAll(address _owner, address _operator)
        public
        view
        override
        returns (bool isOperator)
    {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(_owner)) == _operator) {
            return true;
        }
        return ERC1155.isApprovedForAll(_owner, _operator);
    }
}