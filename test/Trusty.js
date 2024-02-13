const { expect } = require("chai");
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
let Factory = null;
let Trusty = null;

const ethDecimals = 10**18;

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

    // Handle the Trusty Multisignature single deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployTrustySingle = async (owners, threshold = 2) => {    
        const Musig = await ethers.getContractFactory("Trusty");
        const musig = await Musig.deploy(owners, threshold, { value: 0 });
        Trusty = musig
    }

    // Tests with Factory intermediation
    describe("Deploy Factory tests", async() => { 
        it("factory deploy test", async () => {
            await deployFactory()
            expect(Factory.deployTransaction.hash !== null && Factory.address !== null)
        });

        it("factory owner test", async () => {
            await deployFactory()
            expect(accounts.owner === Factory.signer.address === Factory.deployTransaction.from === await Factory.owner())
        });
    });

    describe("Price enabler tests", async() => {
        it("owner toggle price test", async () => {
            await deployFactory();
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const priceEnabled = await Factory.connect(accounts.owner).trustyPriceEnable();
            const enabled = await Factory._priceEnabled();
            expect(enabled).to.equal(true);
        });

        it("should revert toggle price from not owner", async () => {
            await deployFactory();
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await expect(Factory.connect(accounts.randomAccount).trustyPriceEnable()).to.be.reverted;
            await expect(Factory.connect(accounts.randomAccount).trustyPriceEnable()).to.be.revertedWith("Ownable: caller is not the owner");
            const enabled = await Factory._priceEnabled();
            expect(enabled).to.equal(false);
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
    });

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
    });

    describe("Submit, confirm, execute transaction tests", async () =>{
        it("submit, confirm and execute a transaction proposal test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1");
            
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

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance));

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(true);
        })

        it("should revert execution of a transaction proposal already executed test", async () => {
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

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance));

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(true)

            // Re-Execute same tx
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("tx already executed");
            
            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance));
        })

        it("should revert execution of a transaction proposal with more amount than balance test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("1")
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount + BigInt(1), 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            await txConfirm2.wait();

            // Execute a tx
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("tx failed")
            
            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(false)
            
        })

        it("should revert a transaction proposal from not owner test", async () => {
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

        it("should revert a transaction proposal already confirmed from the same caller test", async () => {
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
            const txConfirm = await Factory.connect(accounts.owner).trustyConfirm(0, 0);
            await txConfirm.wait();

            // Re-Confirm a tx from another account of owners
            await expect(Factory.connect(accounts.owner).trustyConfirm(0, 0)).to.be.reverted;
            await expect(Factory.connect(accounts.owner).trustyConfirm(0, 0)).to.be.revertedWith("tx already confirmed");
            
            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[4]).to.equal(1)
        })

        it("should revert confirmation of a transaction proposal from not owner test", async () => {
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

        it("should revert the revoke of a transaction proposal from not owner test", async () => {
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

            // Revoke a tx from a not owner account
            await expect(Factory.connect(accounts.anonymous).trustyRevoke(0, 0)).to.be.reverted
            await expect(Factory.connect(accounts.anonymous).trustyRevoke(0, 0)).to.be.revertedWith("not owner")

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[4]).to.equal(2)
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

        it("should revert the execution of a transaction proposal with less confirmation than minimum test", async () => {
            await deployFactory()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            const create = await Factory.createContract(owners,3,{value:0});
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
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted
            await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("cannot execute tx due to number of confirmation required")

            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(false)
        })

        it("should revert the execution of a transaction proposal from not owner test", async () => {
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
            await expect(Factory.connect(accounts.anonymous).trustyExecute(0,0)).to.be.reverted
            await expect(Factory.connect(accounts.anonymous).trustyExecute(0,0)).to.be.revertedWith("not owner")
            
            // Get Trusty txs status
            const txGet = await Factory.getTx(0,0);

            expect(txGet[3]).to.equal(false)
        })

        /*
        it("test", async () => {
            await mine(1).then(async () => {})
        })
        */
    });

    describe("Destroy tests", async () => {
        it("destroy trusty and withdraw funds test", async () => {
            await deployFactory();

            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("86.9184") //BigInt("99877625337030627022") 
            
            let trustyBalance = await hre.ethers.provider.getBalance(trustyAddr);
            let ownerBalance = await hre.ethers.provider.getBalance(accounts.owner.address);
            //console.log(`[owner-pre-deposit]: ${ownerBalance/ethDecimals}`)
            //console.log(`[trusty-pre-deposit]: ${trustyBalance/ethDecimals}`)
            
            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();

            trustyBalance = await hre.ethers.provider.getBalance(trustyAddr);
            ownerBalance = await hre.ethers.provider.getBalance(accounts.owner.address);
            //console.log(`[owner-post-deposit]: ${ownerBalance/ethDecimals}`)
            //console.log(`[trusty-post-deposit]: ${trustyBalance/ethDecimals}`)
            
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const trusty = await ethers.getContractFactory("Trusty");
            const contract = trusty.attach(trustyAddr);

            await contract.connect(accounts.owner).destroy();

            trustyBalance = await hre.ethers.provider.getBalance(trustyAddr);
            ownerBalance = await hre.ethers.provider.getBalance(accounts.owner.address);
            //console.log(`[owner-post-destroy]: ${ownerBalance/ethDecimals}`)
            //console.log(`[trusty-post-destroy]: ${trustyBalance/ethDecimals}`)     
            
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(0)
            expect(await hre.ethers.provider.getBalance(accounts.owner.address)).to.equal(BigInt(trustyBalance) + BigInt(ownerBalance))
        })
        
        it("destroy trusty and withdraw funds from not owner test", async () => {
            await deployFactory();
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const create = await Factory.createContract(owners,2,{value:0});
            const trustyAddr = await Factory.contracts(0);

            const amount = ethers.utils.parseEther("86.9184")

            const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            await txDeposit.wait();

            let trustyBalance = await hre.ethers.provider.getBalance(trustyAddr);
            let ownerBalance = await hre.ethers.provider.getBalance(accounts.owner.address);

            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const trusty = await ethers.getContractFactory("Trusty");
            const contract = trusty.attach(trustyAddr);

            await expect(contract.connect(accounts.anonymous).destroy()).to.be.reverted
            await expect(contract.connect(accounts.anonymous).destroy()).to.be.revertedWith("not owner")

            trustyBalance = await hre.ethers.provider.getBalance(trustyAddr);
            ownerBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount)
        })
        
    });

    // Tests without Factory intermediation
    describe("Deploy single Trusty without Factory interaction tests", async () => {
        it("deploy single Trusty test", async () => {
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployTrustySingle(owners,2);
            const trustyAddress = Trusty.address;
            //console.log(`[Trusty address]: ${trustyAddress}`);
            expect(Trusty.deployTransaction.hash !== null && Trusty.address !== null);
        });

        it("deposit to single Trusty test", async () => {
            await istantiateAccounts();
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployTrustySingle(owners,2);
            const trustyAddress = Trusty.address;
            
            const amount = ethers.utils.parseEther("0.1");

            // Send ETH without `data`
            await accounts.owner.sendTransaction({to: trustyAddress, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddress)).to.equal(amount);

            // Send ETH with `data`
            await accounts.owner.sendTransaction({to: trustyAddress, value: amount, data: Buffer.from("asd")});
            expect(await hre.ethers.provider.getBalance(trustyAddress)).to.equal(BigInt(amount*2)); //2*10**18

            const ownerBalance = await hre.ethers.provider.getBalance(accounts.owner.address);
            const trustyBalance = await hre.ethers.provider.getBalance(trustyAddress);
            //console.log(`[ownerBalance]: ${ownerBalance/ethDecimals}`);
            //console.log(`[trustyBalance]: ${trustyBalance/ethDecimals}`);
        });

        it("submit, confirm, execute transaction with single Trusty test", async () => {
            await istantiateAccounts();
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployTrustySingle(owners,2);
            const trustyAddress = Trusty.address;
            
            const amount = ethers.utils.parseEther("0.1");

            // Send ETH without `data`
            await accounts.owner.sendTransaction({to: trustyAddress, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddress)).to.equal(amount);

            // Send ETH with `data`
            await accounts.owner.sendTransaction({to: trustyAddress, value: amount, data: Buffer.from("asd")});
            expect(await hre.ethers.provider.getBalance(trustyAddress)).to.equal(BigInt(amount*2)); //2*10**18

            const ownerBalance = await hre.ethers.provider.getBalance(accounts.owner.address);
            const trustyBalance = await hre.ethers.provider.getBalance(trustyAddress);
            //console.log(`[ownerBalance]: ${ownerBalance/ethDecimals}`);
            //console.log(`[trustyBalance]: ${trustyBalance/ethDecimals}`);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            // Submit transaction proposal
            const txSend = await Trusty.connect(accounts.owner).submitTransaction(accounts.anonymous.address, amount, 0x00);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Trusty.connect(accounts.randomAccount).confirmTransaction(0);
            await txConfirm.wait();

            // Confirm a tx from another account of owners
            const txConfirm2 = await Trusty.connect(accounts.other).confirmTransaction(0);
            await txConfirm2.wait();

            // Execute a tx
            const txExe = await Trusty.connect(accounts.owner).executeTransaction(0);
            await txExe.wait();

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(amount) + BigInt(preBalance)).to.equal(BigInt(postBalance));

            // Get Trusty txs status
            const txGet = await Trusty.getTransaction(0);

            expect(txGet[3]).to.equal(true)
        });
    });
});
