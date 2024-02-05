const { assert, expect } = require("chai");

const accounts = {
    owner: "",
    otherOwner: "",
    otherOwner1: "",
    otherOwner2: "",
    otherAccount: "",
    randomPerson: "",
    other: "",
    anonymous: ""
}
let Factory = null


describe("Trusty test",async () => {
    // Handle the Multisignature Factory deploy for each test that needs an istance to run and fill the accounts signers
    async function deployMultisignature() {
        const [owner, otherAccount, otherOwner, otherOwner1, otherOwner2, randomPerson, other, anonymous] = await ethers.getSigners();
        accounts.owner = owner
        accounts.otherAccount = otherAccount
        accounts.otherOwner = otherOwner
        accounts.otherOwner1 = otherOwner1
        accounts.otherOwner2 = otherOwner2
        accounts.randomPerson = randomPerson
        accounts.other = other
        accounts.anonymous = anonymous
        
        const MusigFactory = await ethers.getContractFactory("TrustyFactory");
        const musigFactory = await MusigFactory.deploy({ value: 0 });
        //console.log(`[deployed contract]: ${musigFactory.address}`)
        //console.log(`[Multisignature Contract]: ${Object.keys(musigFactory)}`)
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
            //console.log(`[Multisignature Contract]: ${Object.keys(contract)}`)
            //console.log(`[Deploy tx hash]: ${Factory.deployTransaction.hash}`)
            //console.log(`[Contract address]: ${Factory.address}`)
    
            expect(Factory.deployTransaction.hash !== null && Factory.address !== null)
        });

        it("factory owner test",async () => {
            await deployMultisignature()
        
            //console.log("[Factory Owner]: ",await Factory.owner())
    
            expect(accounts.owner === Factory.signer.address === Factory.deployTransaction.from === await Factory.owner())
        });

        it("create trusty test",async () => {
            await deployMultisignature()

            let owners = [accounts.owner.address, accounts.randomPerson.address, accounts.other.address];

            let totalPre = await Factory.totalTrusty()
            
            expect(totalPre).equals(0)

            let create = await Factory.createContract(owners,2,{value:0}); //ethers.utils.parseEther("0.02")

            let totalPost = await Factory.totalTrusty()

            expect(totalPost).equals(1)

            let addr = await Factory.contracts(0);

            console.log("created multisig: ",addr);

            expect(create.hash !== null)
        });
    });
    
    describe("Re-deploy test",async ()=>{
        it("factory re-deploy",async ()=>{
            await deployMultisignature()
            //console.log(`[Contract address]: ${Factory.address}`)
        })
    })



});