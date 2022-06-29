// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.6;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
contract NFTMArket is Pausable, Ownable {
    
     struct Asset {
        uint256 TokenId;
        uint256 Price;
        address Owner;
        address Creator;
        uint256 Royalty;
    }
    mapping(uint => Asset) public assetTable;
    /// @dev Transfer event as defined in current draft of ERC721.
    ///  ownership is assigned, including births.
    event TokenSold(uint256 tokenId, uint256 tokenPrice, address newOwner);
    event TransferAsset(address from, address to, uint256 tokenId);
    uint256 private CREATOR_COMMISSION = 5;
    uint256 private PLATFORM_COMMISSION = 3;
    address private PLATFORM_ADDRESS = 0x1652149105D6d5F41844B1104499d0C2E4930ee7;
    
    NFT nft;
    constructor(address _nftContractAddress)  {
        nft = NFT(_nftContractAddress);
    }
    
    function safeMintAsset(
        uint256 _tokenId,
        uint256 _price,
        uint256 royalty
        )
        public  {
        nft.safeMint(msg.sender, _tokenId);
        assetTable[_tokenId].Price = _price;
        assetTable[_tokenId].Royalty = royalty;
        assetTable[_tokenId].Owner = msg.sender;
        assetTable[_tokenId].Creator = msg.sender;
    }
    function buyNFT(uint256 _tokenId) public payable {
        address payable oldOwner = payable(assetTable[_tokenId].Owner);
        address payable creator = payable(assetTable[_tokenId].Creator);
        address payable platform = payable(PLATFORM_ADDRESS);
        address newOwner = msg.sender;
        // uint256 sellingPrice = assetTable[_tokenId].Price;
        // require(balanceOf(msg.sender) >= sellingPrice);
        // require(msg.value == sellingPrice);
        // require(getApproved(_tokenId) == _msgSender(), "spender is not approved") ;
        uint256 forCreator;
        if(assetTable[_tokenId].Royalty == 0){
            forCreator = msg.value * CREATOR_COMMISSION / 100;
        } else {
            forCreator = msg.value * assetTable[_tokenId].Royalty / 100;
        }
        uint256 forPlatform = msg.value * PLATFORM_COMMISSION /100;
        uint256 forOwner = msg.value - forCreator - forPlatform;
        creator.transfer(forCreator);
        platform.transfer(forPlatform);
        oldOwner.transfer(forOwner);
        nft.safeTransferFrom(assetTable[_tokenId].Owner, newOwner, _tokenId);
        assetTable[_tokenId].Owner = msg.sender;
    }
    function getTokenPrice(uint256 _tokenId) public view returns (uint256){
        return assetTable[_tokenId].Price;
    }
    function sendViaTransfer(address payable _to) public payable {
        // This function is no longer recommended for sending Ether.
        _to.transfer(msg.value);
    }
    function getBalance(address user) public view returns (uint256 balance) {
        return user.balance;
    }
    function updatePrice(uint256 _tokenId, uint256 newPrice) public returns (bool success){
        require(msg.sender ==  assetTable[_tokenId].Owner);
        require(newPrice > 0);
        assetTable[_tokenId].Price = newPrice;
        return true;
    }
    function getAsset(uint256 _tokenId) public view returns (uint256, address) {
        return (assetTable[_tokenId].Price ,assetTable[_tokenId].Owner);
    }
    function safeTransferAsset(
        address to,
        uint256 tokenId
    ) public returns (bool success) {
        require(assetTable[tokenId].Owner == msg.sender);
        nft.safeTransferFrom(msg.sender, to, tokenId);
        assetTable[tokenId].Owner = to;
        return true;
    }
    
    /* PRIVATE FUNCTIONS */
    /// Safety check on _to address to prevent against an unexpected 0x0 default.
    function _addressNotNull(address _to) private pure returns (bool) {
        return _to != address(0);
    }
}
contract NFT is ERC721,ERC721Enumerable, ERC721URIStorage, Pausable, Ownable, ERC721Burnable {
    constructor() ERC721("NFTMARKET", "NM") {}
    // The following functions are overrides required by Solidity.
    function _baseURI() internal pure override returns (string memory) {
        return "https://marketplace-nft.s3.amazonaws.com/metadata/";
    }
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    function safeMint(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
     function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}