const { assert, expect } = require("chai");

const accounts = {
    owner: "",
    otherOwner: "",
    otherOwner1: "",
    otherOwner2: "",
    otherAccount: "",
    randomAccount: "",
    other: "",
    anonymous: ""
}
let Factory = null


describe("Trusty test",async () => {
    // Handle the Multisignature Factory deploy for each test that needs an istance to run and fill the accounts signers
    const deployMultisignature = async () => {
        const [owner, otherAccount, otherOwner, otherOwner1, otherOwner2, randomAccount, other, anonymous] = await ethers.getSigners();
        accounts.owner = owner
        accounts.otherAccount = otherAccount
        accounts.otherOwner = otherOwner
        accounts.otherOwner1 = otherOwner1
        accounts.otherOwner2 = otherOwner2
        accounts.randomAccount = randomAccount
        accounts.other = other
        accounts.anonymous = anonymous
        
        const MusigFactory = await ethers.getContractFactory("TrustyFactory");
        const musigFactory = await MusigFactory.deploy({ value: 0 });
        Factory = musigFactory
    }
    
    /**
     * [Multisignature Contract]: 
     * interface,provider,signer,callStatic,estimateGas,functions,populateTransaction,filters,
     * _runningEvents,_wrappedEmits,address,resolvedAddress,_price(),contractAction(uint256,uint256),
     * contractReadBalance(uint256),contractReadOwners(uint256),contractReadTxs(uint256),
     * contracts(uint256),createContract(address[],uint256),depositContract(uint256,uint256),
     * getTx(uint256,uint256),imOwner(uint256),owner(),renounceOwnership(),totalTrusty(),
     * transferOwnership(address),trustyConfirm(uint256,uint256),trustyExecute(uint256,uint256),
     * trustyOwner(uint256,uint256),trustyPriceConfig(uint256),trustyRevoke(uint256,uint256),
     * trustySubmit(uint256,address,uint256,bytes),withdraw(),_price,contractAction,contractReadBalance,
     * contractReadOwners,contractReadTxs,contracts,createContract,depositContract,getTx,imOwner,owner,
     * renounceOwnership,totalTrusty,transferOwnership,trustyConfirm,trustyExecute,trustyOwner,trustyPriceConfig,
     * trustyRevoke,trustySubmit,withdraw,deployTransaction
     */

    describe("Deploy test",async() => { 
        it("factory deploy test",async () => {
            await deployMultisignature()    
            expect(Factory.deployTransaction.hash !== null && Factory.address !== null)
        });

        it("factory owner test",async () => {
            await deployMultisignature()
            expect(accounts.owner === Factory.signer.address === Factory.deployTransaction.from === await Factory.owner())
        });

        it("create trusty test",async () => {
            await deployMultisignature()

            let owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            let totalPre = await Factory.totalTrusty()
            
            expect(totalPre).equals(0)

            let create = await Factory.createContract(owners,2,{value:0});

            let totalPost = await Factory.totalTrusty()

            expect(totalPost).equals(1)

            //let addr = await Factory.contracts(0);

            expect(create.hash !== null)
        });
    });
});
