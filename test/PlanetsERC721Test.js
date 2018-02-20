const tokenContract = artifacts.require('./PlanetsERC721.sol')
const BigNumber = web3.BigNumber

contract('PlanetsERC721', accounts => {
  var owner = accounts[0]
  var accountOne = accounts[1]
  let startPrice = 0.005
  let planets

  beforeEach(async function () {
    planets = await tokenContract.new({ from: owner })
  })

  it('has initial state', async function () {
    const name = await planets.getName()
    const symbol = await planets.getSymbol()

    assert.equal(name, "PLANETS")
    assert.equal(symbol, "P")
  })

  it('has correct owner on initialization', async function () {
    const actualOwner = await planets.owner()
    assert.equal(actualOwner, owner)
  })

  it('mints planets on initialization', async function () {
    const planetCount = await planets.balanceOf(owner)
    assert.equal(planetCount, 8)
  })

  it('gives planets a starting price of .01 ether', async function () {
    const price = await planets.getCurrentPrice(3);
    assert.equal(price.toNumber(), web3.toWei(startPrice, "ether"))
  })

  it('sets asking price for planets', async function () {
    const currentPrice = await planets.getCurrentPrice(3);
    const askingPrice = await planets.getAskingPrice(3);
    assert.equal(currentPrice * 2, askingPrice)
    //assert.equal(askingPrice, web3.toWei(0.02, "ether"))
  })

  it('fetches name, owner, and asking price', async function () {
    const planetInfo = await planets.getPlanet(4);
    assert.equal(planetInfo[0], "Mars")
    assert.equal(planetInfo[1], owner);
    assert.equal(planetInfo[2].toNumber(), web3.toWei(startPrice * 2, "ether"))
  })

  describe('planets can be bought for asking price', () => {
    let planetId = 1;
    let ownerBalance;
    let tx;

    beforeEach(async function () {
      ownerBalance = await web3.eth.getBalance(owner);
      tx = await planets.buyPlanet(planetId, { from: accountOne, value: web3.toWei(startPrice * 2, "ether") });
    })

    it('correctly assigns new owner', async function () {
      const owner = await planets.ownerOf(planetId);
      assert.equal(owner, accountOne);
    })

    it('correctly sends ether to previous owner', async function () {
      const newOwnerBalance = await web3.eth.getBalance(owner);
      const currentPrice = await planets.getCurrentPrice(planetId);
      assert.equal(newOwnerBalance.toNumber(), ownerBalance.toNumber() + currentPrice.toNumber());
    })

    it('correctly updates price', async function () {
      const price = await planets.getCurrentPrice(planetId);
      assert.equal(web3.toWei(startPrice * 2, "ether"), price.toNumber());
    })
  })

  describe('rejects attempt to buy without enough ether', () => {
    let planetId = 2;

    beforeEach(async function () {
      await expectThrow(planets.buyPlanet(planetId, { from: accountOne, value: web3.toWei(startPrice, "ether") }));
    })

    it('correctly rejects tx without enough funds', async function () {
      const owner = await planets.ownerOf(planetId);
      assert.notEqual(owner, accountOne);
    })

    it('does not update the price after rejected buy attempt', async function () {
      const price = await planets.getCurrentPrice(planetId);
      assert.equal(web3.toWei(startPrice, "ether"), price.toNumber());
    })
  })

  var expectThrow = async promise => {
    try {
      await promise;
    } catch (error) {
      // TODO: Check jump destination to destinguish between a throw
      //       and an actual invalid jump.
      const invalidOpcode = error.message.search('invalid opcode') >= 0;
      // TODO: When we contract A calls contract B, and B throws, instead
      //       of an 'invalid jump', we get an 'out of gas' error. How do
      //       we distinguish this from an actual out of gas event? (The
      //       testrpc log actually show an 'invalid jump' event.)
      const outOfGas = error.message.search('out of gas') >= 0;
      const revert = error.message.search('revert') >= 0;
      assert(
        invalidOpcode || outOfGas || revert,
        'Expected throw, got \'' + error + '\' instead',
      );
      return;
    }
    assert.fail('Expected throw not received');
  };

})
