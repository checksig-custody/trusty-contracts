const { assert, expect } = require("chai");
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

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

/**
 * [Trusty Multisignature Contract]: 
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

describe("Trusty tests", async () => {
    // Create various accounts signers for testing purpose
    const istantiateAccounts = async () => {
        const [owner, otherAccount, otherOwner, otherOwner1, otherOwner2, randomAccount, other, anonymous] = await ethers.getSigners();
        accounts.owner = owner
        accounts.otherAccount = otherAccount
        accounts.otherOwner = otherOwner
        accounts.otherOwner1 = otherOwner1
        accounts.otherOwner2 = otherOwner2
        accounts.randomAccount = randomAccount
        accounts.other = other
        accounts.anonymous = anonymous
    }

    // Handle the Trusty Multisignature Factory deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployFactory = async () => {    
        istantiateAccounts()    
        const MusigFactory = await ethers.getContractFactory("TrustyFactory");
        const musigFactory = await MusigFactory.deploy({ value: 0 });
        Factory = musigFactory
    }

    describe("Deploy tests", async() => { 
        it("factory deploy test", async () => {
            await deployFactory()    
            expect(Factory.deployTransaction.hash !== null && Factory.address !== null)
        });

        it("factory owner test", async () => {
            await deployFactory()
            expect(accounts.owner === Factory.signer.address === Factory.deployTransaction.from === await Factory.owner())
        });
    });

    describe("Create Trusty tests", async () => {
        it("create 2of3 test", async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            const totalPre = await Factory.totalTrusty()
            
            expect(totalPre).equals(0)

            const create = await Factory.createContract(owners,2,{value:0});

            const totalPost = await Factory.totalTrusty()

            expect(totalPost).equals(1)

            //const addr = await Factory.contracts(0);

            expect(create.hash !== null)
        });

        it("create 3of3 test", async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            const totalPre = await Factory.totalTrusty()
            
            expect(totalPre).equals(0)

            const create = await Factory.createContract(owners,3,{value:0});

            const totalPost = await Factory.totalTrusty()

            expect(totalPost).equals(1)

            //const addr = await Factory.contracts(0);

            expect(create.hash !== null)
        });

        it("should revert with empty owners array test", async () => {
            await deployFactory()

            const owners = [];

            await expect(Factory.createContract(owners,0,{value:0})).to.be.reverted
        });

        it("should revert with 1of2 test",async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address];

            await expect(Factory.createContract(owners,1,{value:0})).to.be.reverted
        });

        it("should revert with 0 threshold test",async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            await expect(Factory.createContract(owners,0,{value:0})).to.be.reverted
        });

        it("should revert with wrong threshold test",async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            await expect(Factory.createContract(owners,1,{value:0})).to.be.reverted
        });

        it("should revert with more threshold than owners test",async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];

            await expect(Factory.createContract(owners,4,{value:0})).to.be.reverted
        });

        it("should revert with duplicated owners test",async () => {
            await deployFactory()

            let owners = [accounts.owner.address, accounts.randomAccount.address, accounts.randomAccount.address];

            await expect(Factory.createContract(owners,3,{value:0})).to.be.reverted

            owners = [accounts.owner.address, accounts.owner.address, accounts.randomAccount.address];

            await expect(Factory.createContract(owners,3,{value:0})).to.be.reverted

            owners = [accounts.owner.address, accounts.randomAccount.address, accounts.randomAccount.address];

            await expect(Factory.createContract(owners,3,{value:0})).to.be.reverted

            owners = [accounts.owner.address, accounts.owner.address, accounts.owner.address];

            await expect(Factory.createContract(owners,3,{value:0})).to.be.reverted
        });

        it("should revert using address 0x0 test",async () => {
            await deployFactory()

            const owners = [accounts.owner.address, accounts.randomAccount.address, "0x0000000000000000000000000000000000000000"];

            await expect(Factory.createContract(owners,3,{value:0})).to.be.reverted
        });
    })

    describe("Deposit to Trusty tests", async () => {
        it("send ether directly test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            // Send ETH without `data`
            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            // Send ETH with `data`
            await accounts.owner.sendTransaction({to: trustyAddr, value: ethers.utils.parseEther("1"), data: Buffer.from("asd")});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(BigInt(amount*2)); //2*10**18
        })

        it("deposit ether with contract method test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
        })
    })

    // Submit TX
    describe("Submit transaction tests", async () =>{
        it("submit, confirm and execute a transaction proposal test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Execute a tx
            const txExe = await Factory.connect(accounts.owner).trustyExecute(0,0);
            await txExe.wait();

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(true)
        })

        it("should revert with a transaction proposal from not owner test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            await expect(Factory.connect(accounts.anonymous).trustySubmit(0, accounts.anonymous.address, amount, 0x00)).to.be.reverted
            await expect(Factory.connect(accounts.anonymous).trustySubmit(0, accounts.anonymous.address, amount, 0x00)).to.be.revertedWith("not owner");
        })

        it("confirm a transaction proposal test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[4]).to.equal(2)
        })

        it("confirm a transaction proposal from not owner test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            await expect(Factory.connect(accounts.anonymous).trustyConfirm(0, 0)).to.be.reverted
            await expect(Factory.connect(accounts.anonymous).trustyConfirm(0, 0)).to.be.revertedWith("not owner")

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[4]).to.equal(1)
        })

        it("revoke a transaction proposal test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Revoke a tx from another account of owners
            const txRevoke = await Factory.connect(accounts.other).trustyRevoke(0, 0);
            await txRevoke.wait();

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[4]).to.equal(1)
        })

        it("execute a transaction proposal test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Execute a tx
            const txExe = await Factory.connect(accounts.owner).trustyExecute(0,0);
            await txExe.wait();

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(true)
        })

        /*
        it("test", async () => {
            await mine(1).then(async () => {})
        })
        */
    })
    // Sign TX
    // Revoke TX
    // Execute TX

    // Destroy
});
