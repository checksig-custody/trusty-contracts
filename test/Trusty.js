const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = require("hardhat");
//const { ethers } = require("ethers")
const { mine } = require("@nomicfoundation/hardhat-network-helpers");

const accounts = {
    owner: "",
    otherOwner: "",
    otherOwner1: "",
    otherOwner2: "",
    otherAccount: "",
    randomAccount: "",
    other: "",
    anonymous: "",
    erc20contract: "",
    recovery: "",
    auth1: "",
    auth2: "",
    auth3: "",
    fede1: "",
    fede2: "",
    fede3: "",
    fede4: "",
    fede5: "",
    fede6: "",
}

let Recovery = null;
let Erc20 = null;

let Cold = null;
let Frozen = null;

const BLOCKLOCK = 28800;

describe("Trusty tests", async () => {
    // Create various accounts signers for testing purpose
    const istantiateAccounts = async () => {
        const addresses = await hre.ethers.getSigners();  
        // for (const account of addresses) {
        //     console.log(account.address);
        // }
        accounts.owner = addresses[0]
        accounts.otherAccount = addresses[1]
        accounts.otherOwner = addresses[2]
        accounts.otherOwner1 = addresses[3]
        accounts.otherOwner2 = addresses[4]
        accounts.randomAccount = addresses[5]
        accounts.other = addresses[6]
        accounts.anonymous = addresses[7]
        accounts.erc20contract = addresses[8]
        accounts.auth1 = addresses[9]
        accounts.auth2 = addresses[10]
        accounts.auth3 = addresses[11]
        accounts.fede1 = addresses[12]
        accounts.fede2 = addresses[13]
        accounts.fede3 = addresses[14]
        accounts.fede4 = addresses[15]
        accounts.fede5 = addresses[16]
        accounts.fede6 = addresses[17]
        accounts.recovery = addresses[18]
    }

    // Handle the Trusty Multisignature Factory deploy for each test that needs an istance to run and fill the necessary accounts signers
    const deployRecovery = async (owners, threshold = 2,id="") => {    
        const MusigRecovery = await ethers.getContractFactory("Recovery");
        const musigRecovery = await MusigRecovery.deploy(owners, threshold, id, { value: 0 });
        Recovery = musigRecovery
    }

    // Handle the Deploy of an ERC20 Token for testing purpose
    const deployErc20 = async () => {
        const Erc20Contract = await ethers.getContractFactory("ERC20");
        const erc20 = await Erc20Contract.deploy();
        Erc20 = erc20
    }

    const deployTrustyCold = async (owners, threshold = 2,id="",recovery) => {    
        const MusigCold = await ethers.getContractFactory("TrustyCold");
        const musig = await MusigCold.deploy(owners, threshold, id, recovery, BLOCKLOCK, { value: 0 });
        Cold = musig
    }

    const deployTrustyFrozen = async (owners, threshold = 2,id="", recovery, authorizers) => {    
        const MusigFrozen = await ethers.getContractFactory("TrustyFrozen");
        const musig = await MusigFrozen.deploy(owners, threshold, id, recovery, BLOCKLOCK, authorizers, { value: 0 });
        Frozen = musig
    }

    /**
     * 
     */
    describe("Contracts coverage", async() => {
        it("erc20", async () => {
            await istantiateAccounts()
            await deployErc20()
            const erc20Addr = await Erc20.getAddress()
            const erc20Supply = await Erc20.balanceOf(accounts.owner.address)
            
            const erc20amount = ethers.parseEther("1000")
            const erc20amount2 = ethers.parseEther("1")
            
            const erc20approve = await Erc20.connect(accounts.owner).approve(accounts.anonymous.address, erc20amount2)
            await erc20approve.wait()
            
            const erc20transfer = await Erc20.connect(accounts.owner).transfer(accounts.anonymous.address, erc20amount)
            await erc20transfer.wait()            

            //const erc20transferFrom = await Erc20.connect(accounts.owner).transferFrom(accounts.owner.address, accounts.anonymous.address, 1n)
            //await erc20transferFrom.wait()
            
            //console.log(">>> ",await Erc20.balances(accounts.owner.address))
            //console.log(">>> ",await Erc20.allowance(accounts.owner.address, accounts.anonymous.address))
            //console.log(">>> ", erc20amount2)

            expect(await Erc20.balances(accounts.owner.address)).to.equal(erc20Supply - erc20amount)
            expect(await Erc20.allowance(accounts.owner.address, accounts.anonymous.address)).to.equal(erc20amount2)
            expect(await Erc20.balanceOf(accounts.anonymous.address)).to.equal(erc20amount)
        })

        it("execute a transaction test", async () => {
            const TIME_LOCK = 7200
            await istantiateAccounts()
            
            const owners = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            
            await deployRecovery(authorizers,2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();
            //console.log("[RECOVERY]",recoveryAddr);
            
            await deployTrustyFrozen([...authorizers,...owners],3,"Frozen", recoveryAddr,authorizers)
            const frozenAddr = await Frozen.getAddress();
            //console.log("[FROZEN]",frozenAddr);

            await accounts.owner.sendTransaction({to: frozenAddr, value: 1n, data: Buffer.from("fallback test")});

            const checkOwner = await Frozen.getOwners()

            expect(checkOwner[0]).to.be.equal(authorizers[0])
            expect(checkOwner[1]).to.be.equal(authorizers[1])
            expect(checkOwner[2]).to.be.equal(authorizers[2])
            expect(checkOwner[3]).to.be.equal(owners[0])
            expect(checkOwner[4]).to.be.equal(owners[1])
            expect(checkOwner[5]).to.be.equal(owners[2])
            expect(checkOwner[6]).to.be.equal(owners[3])
            expect(checkOwner[7]).to.be.equal(owners[4])
            expect(checkOwner[8]).to.be.equal(owners[5])
            
            const amount = ethers.parseEther("1")
            
            await accounts.owner.sendTransaction({to: frozenAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(frozenAddr)).to.equal(amount + 1n);
            
            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);
            
            const txSend = await Frozen.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), 7200);
            await txSend.wait();
            
            // Authorize a tx from an account of owners
            const txAuthorize = await Frozen.connect(accounts.auth2).authorizeTransaction(0)
            await txAuthorize.wait()

            // Authorize a tx from another account of owners
            const txAuthorize2 = await Frozen.connect(accounts.auth3).authorizeTransaction(0)
            await txAuthorize2.wait() 

            // Confirm a tx from an account of owners
            const txConfirm = await Frozen.connect(accounts.fede1).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            const txConfirm2 = await Frozen.connect(accounts.fede2).confirmTransaction(0)
            await txConfirm2.wait()

            // Confirm a tx from another account of owners
            const txConfirm3 = await Frozen.connect(accounts.fede3).confirmTransaction(0)
            await txConfirm3.wait()

            // Revoke a tx from another account of owners
            const txRevoke3 = await Frozen.connect(accounts.fede3).revokeConfirmation(0)
            await txRevoke3.wait()

            // Confirm a tx from another account of owners
            const txConfirm4 = await Frozen.connect(accounts.fede4).confirmTransaction(0)
            await txConfirm4.wait()

            await mine(TIME_LOCK-6).then(async () => {
                const txExecute = await Frozen.connect(accounts.auth2).executeTransaction(0)
                await txExecute.wait()
            })

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)+BigInt(amount)).to.equal(BigInt(postBalance))

            // Get Trusty State
            const txGet = await Frozen.getTransaction(0);
            expect(txGet[3]).to.equal(true)

            const trustyBalance = await Frozen.getBalance()
            //console.log("FROZEN BALANCE: ", trustyBalance);

            const trustyTxCount = await Frozen.getTransactionCount()
            //console.log("FROZEN TX COUNT: ", trustyTxCount);
            expect(trustyTxCount).to.equal(1)

            for (let i = 0; i < trustyTxCount; i++) {
                const trustyTx = await Frozen.getTransaction(i)
                //console.log("FROZEN TX: ", trustyTx);
                expect(trustyTx.to).to.equal(accounts.anonymous.address)
            }
            
        })

        it("Recovery test", async () => {
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployRecovery(owners,2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();

            const checkOwner = await Recovery.getOwners()
            
            expect(checkOwner[0]).to.be.equal(owners[0])
            expect(checkOwner[1]).to.be.equal(owners[1])
            expect(checkOwner[2]).to.be.equal(owners[2])

            const recover = await Recovery.submitTransaction(recoveryAddr, 0, Buffer.from("revoking test"));
            await recover.wait()

            const confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
            await confirm.wait()

            const confirm2 = await Recovery.connect(accounts.owner).confirmTransaction(0);
            await confirm2.wait()

            const revoke = await Recovery.connect(accounts.randomAccount).revokeConfirmation(0);
            await revoke.wait()
            
            await expect(Recovery.connect(accounts.other).executeTransaction(0)).to.be.revertedWith("cannot execute tx due to number of confirmation required")

            await accounts.owner.sendTransaction({to: recoveryAddr, value: 1n, data: Buffer.from("fallback test")});
            const recoveryBalance = await hre.ethers.provider.getBalance(recoveryAddr)
            expect(recoveryBalance).to.be.equal(1n)
        })

        it("Cold test", async () => {
            const TIME_LOCK = 7200
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployRecovery(owners,2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployTrustyCold(authorizers,2,"Cold", recoveryAddr)
            const trustyAddr = await Cold.getAddress();

            const checkOwner = await Cold.getOwners()

            expect(checkOwner[0]).to.be.equal(authorizers[0])
            expect(checkOwner[1]).to.be.equal(authorizers[1])
            expect(checkOwner[2]).to.be.equal(authorizers[2])

            await accounts.owner.sendTransaction({to: trustyAddr, value: 1n, data: Buffer.from("balance test")});

            const txSend = await Cold.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, 1n, Buffer.from(""), 0);
            await txSend.wait();

            const trustyTxCount = await Cold.getTransactionCount()
            expect(trustyTxCount).to.equal(1)

            // Confirm a tx from an account of owners
            const txConfirm = await Cold.connect(accounts.auth1).confirmTransaction(0)
            await txConfirm.wait()

            const txConfirm1 = await Cold.connect(accounts.auth2).confirmTransaction(0)
            await txConfirm1.wait()

            // Confirm a tx from another account of owners
            const txRevoke = await Cold.connect(accounts.auth2).revokeConfirmation(0)
            await txRevoke.wait()

            const txConfirm2 = await Cold.connect(accounts.auth3).confirmTransaction(0)
            await txConfirm2.wait()

            await mine(TIME_LOCK + BLOCKLOCK).then(async () => {
                const txExecute = await Cold.connect(accounts.auth2).executeTransaction(0)
                await txExecute.wait()
            })
            
            const coldBalance = await hre.ethers.provider.getBalance(trustyAddr)
            const trustyBalance = await Cold.getBalance()

            expect(coldBalance).to.be.equal(trustyBalance)
        })
    })

    /**
     * CKSG
     */
    describe("Type Cold Recovery tests", async () => {
        it("execute an eth recovery test", async () => {
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            await deployRecovery(owners,2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();
            //console.log("[RECOVERY]",recoveryAddr);
            
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployTrustyCold(authorizers,2,"Cold", recoveryAddr)
            const trustyAddr = await Cold.getAddress();
            
            const amount = ethers.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Cold.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), 1000);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Cold.connect(accounts.auth2).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            const txConfirm2 = await Cold.connect(accounts.auth3).confirmTransaction(0)
            await txConfirm2.wait()        

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Cold.getTransaction(0);

            expect(txGet[3]).to.equal(false)

            // Executes RECOVERY

            //0xce746024 //0x7c0f1ee7
            const recover = await Recovery.submitTransaction(trustyAddr, 0, "0xce746024");
            await recover.wait()

            const confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
            await confirm.wait()

            const confirm2 = await Recovery.connect(accounts.other).confirmTransaction(0);
            await confirm2.wait()

            const executeRecover = await Recovery.connect(accounts.other).executeTransaction(0);
            await executeRecover.wait();

            const trustyBal = await hre.ethers.provider.getBalance(trustyAddr)
            const recoveryBal = await hre.ethers.provider.getBalance(recoveryAddr)

            expect(BigInt(trustyBal)).to.equal(BigInt(0));
            expect(BigInt(recoveryBal)).to.equal(amount);

            const recoveryTxCount = await Recovery.getTransactionCount()
            expect(recoveryTxCount).to.equal(1)

            for (let i = 0; i < recoveryTxCount; i++) {
                const recoveryTx = await Recovery.getTransaction(i)
                expect(recoveryTx.to).to.equal(trustyAddr)
            }

            expect(await Recovery.getBalance()).to.equal(recoveryBal)
        })

        it("execute an erc20 recovery after absolute timelock expiring test", async () => {
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            
            await deployRecovery(owners,2, "RECOVERY", [...owners]);
            const recoveryAddr = await Recovery.getAddress();

            await deployErc20()
            const erc20Addr = await Erc20.getAddress()
            //console.log("[RECOVERY]",Recovery.address);
            
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployTrustyCold(authorizers,2,"Cold", recoveryAddr)
            const trustyAddr = await Cold.getAddress();
            
            const amount = ethers.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            const erc20amount = ethers.parseEther("100000000")

            const erc20approve = await Erc20.connect(accounts.owner).approve(trustyAddr, erc20amount)
            await erc20approve.wait()

            const erc20transfer = await Erc20.connect(accounts.owner).transfer(trustyAddr, erc20amount)
            await erc20transfer.wait()

            //const erc20Trustybal = await Erc20.connect(accounts.owner).balanceOf(trustyAddr)
            //console.log(`[Erc20Trustybal-preRecover]: ${erc20Trustybal}`)
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Cold.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Cold.connect(accounts.auth2).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Cold.connect(accounts.auth3).confirmTransaction(0)
            await txConfirm2.wait()
            
            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Cold.getTransaction(0);

            expect(txGet[3]).to.equal(false)

            // Executes RECOVERY
            //const recoverWhitelist = await Recovery.addAddressToRecoveryWhitelist([trustyAddr]);
            //await recoverWhitelist.wait();

            // ETH Recovery //0xce746024 //0x7c0f1ee7
            const recover = await Recovery.submitTransaction(trustyAddr, 0, "0xce746024");
            await recover.wait()

            const confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
            await confirm.wait()

            const confirm2 = await Recovery.connect(accounts.other).confirmTransaction(0);
            await confirm2.wait()

            const executeRecover = await Recovery.connect(accounts.other).executeTransaction(0);
            await executeRecover.wait();

            const trustyBal = await hre.ethers.provider.getBalance(trustyAddr)
            const recoveryBal = await hre.ethers.provider.getBalance(recoveryAddr)

            expect(BigInt(trustyBal)).to.equal(BigInt(0));
            expect(BigInt(recoveryBal)).to.equal(amount);

            //console.log(hre.ethers.utils.hexlify(erc20amount)) //52b7d2dcc80cd2e4000000
            //console.log(Erc20.address.slice(2,Erc20.address.length))

            // ERC20 Recovery
            //const erc20recover = await Recovery.submitTransaction(trustyAddr, 0, `0x8980f11f000000000000000000000000${Erc20.address.slice(2,Erc20.address.length)}000000000000000000000000000000000000000000${hre.ethers.utils.hexlify(erc20amount).slice(2)}`, 0);
            const erc20recover = await Recovery.submitTransaction(trustyAddr, 0, `0x9e8c708e000000000000000000000000${erc20Addr.slice(2,erc20Addr.length)}`);
            await erc20recover.wait()

            const erc20confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(1);
            await erc20confirm.wait()

            const erc20confirm2 = await Recovery.connect(accounts.other).confirmTransaction(1);
            await erc20confirm2.wait()

            const erc20executeRecover = await Recovery.connect(accounts.other).executeTransaction(1);
            await erc20executeRecover.wait();
            
            const erc20Trustybal = await Erc20.connect(accounts.owner).balanceOf(trustyAddr)
            //console.log(`[Erc20Trustybal-postRecover]: ${erc20Trustybal}`)

            const erc20Recoverybal = await Erc20.connect(accounts.owner).balanceOf(recoveryAddr)
            //console.log(`[Erc20Recoverybal-postRecover]: ${erc20Recoverybal}`)

            expect(BigInt(erc20Trustybal)).to.equal(BigInt(0));
            expect(BigInt(erc20Recoverybal)).to.equal(erc20amount);
        })

        it("should revert a recover from not recovery address test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            await deployRecovery(owners,2, "RECOVERY", [...owners]);
            const recoveryAddr = await Recovery.getAddress();
            //console.log("[RECOVERY]",Recovery.address);
            
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployTrustyCold(authorizers,2,"Cold", recoveryAddr)
            const trustyAddr = await Cold.getAddress();
            
            const amount = ethers.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Cold.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Cold.connect(accounts.auth2).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Cold.connect(accounts.auth3).confirmTransaction(0)
            await txConfirm2.wait()

            // Execute a tx after Absolute TimeLock
            await mine(ABSOLUTE_LOCK + 120).then(async () => {
                //const txExe = 
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
                //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Trusty is locked!")
                //await txExe.wait();                       

                const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

                expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

                // Get Trusty txs status
                //const txGet = await Factory.getTx(0,0);
                const txGet = await Cold.getTransaction(0);

                expect(txGet[3]).to.equal(false)

                // Executes RECOVERY

                //0xce746024 //0x7c0f1ee7
                await expect(Recovery.connect(accounts.anonymous).submitTransaction(trustyAddr, 0, "0xce746024")).to.be.reverted;
                

                const recover = await Recovery.connect(accounts.owner).submitTransaction(trustyAddr, 0, "0xce746024");
                await recover.wait()

                const confirm = await Recovery.connect(accounts.randomAccount).confirmTransaction(0);
                await confirm.wait()

                const confirm2 = await Recovery.connect(accounts.other).confirmTransaction(0);
                await confirm2.wait()

                //const executeRecover = 
                //await Recovery.connect(accounts.other).executeTransaction(0)

                const trustyBal = await hre.ethers.provider.getBalance(trustyAddr)
                const recoveryBal = await hre.ethers.provider.getBalance(recoveryAddr)

                expect(BigInt(trustyBal)).to.equal(amount);
                expect(BigInt(recoveryBal)).to.equal(BigInt(0));
            })
        })
    })

    describe("Type Frozen Recovery tests", async () => {
        it("execute an eth recovery test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await istantiateAccounts()
            const owners = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployRecovery(authorizers,2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();
            //console.log("[RECOVERY]",Recovery.address);
            
            await deployTrustyFrozen([...authorizers,...owners],3,"Frozen", recoveryAddr,authorizers)
            const trustyAddr = await Frozen.getAddress();
            
            const amount = ethers.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Frozen.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), 1000);
            await txSend.wait();

            // Authorize a tx from an account of owners
            const txAuthorize = await Frozen.connect(accounts.auth2).authorizeTransaction(0)
            await txAuthorize.wait()

            // Authorize a tx from another account of owners
            const txAuthorize2 = await Frozen.connect(accounts.auth3).authorizeTransaction(0)
            await txAuthorize2.wait() 

            // Confirm a tx from an account of owners
            const txConfirm = await Frozen.connect(accounts.fede1).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            const txConfirm2 = await Frozen.connect(accounts.fede2).confirmTransaction(0)
            await txConfirm2.wait()

            // Confirm a tx from another account of owners
            const txConfirm3 = await Frozen.connect(accounts.fede3).confirmTransaction(0)
            await txConfirm3.wait()

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Frozen.getTransaction(0);

            expect(txGet[3]).to.equal(false)

            // Executes RECOVERY

            //0xce746024 //0x7c0f1ee7
            const recover = await Recovery.connect(accounts.auth1).submitTransaction(trustyAddr, 0, "0xce746024");
            await recover.wait()

            const confirm = await Recovery.connect(accounts.auth2).confirmTransaction(0);
            await confirm.wait()

            const confirm2 = await Recovery.connect(accounts.auth3).confirmTransaction(0);
            await confirm2.wait()

            await mine(ABSOLUTE_LOCK + 113).then(async () => {
                const executeRecover = await Recovery.connect(accounts.auth1).executeTransaction(0);
                await executeRecover.wait();
            })

            const trustyBal = await hre.ethers.provider.getBalance(trustyAddr)
            const recoveryBal = await hre.ethers.provider.getBalance(recoveryAddr)

            expect(BigInt(trustyBal)).to.equal(BigInt(0));
            expect(BigInt(recoveryBal)).to.equal(amount);
        })

        it("execute an erc20 recovery test", async () => {
            const ABSOLUTE_LOCK = 28800;
            await istantiateAccounts()
            const owners = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployRecovery(authorizers, 2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();
            //console.log("[RECOVERY]",Recovery.address);
            await deployErc20()
            const erc20Addr = await Erc20.getAddress()
            
            await deployTrustyFrozen([...authorizers,...owners],3,"Frozen", recoveryAddr, authorizers)
            const trustyAddr = await Frozen.getAddress();
            
            const amount = ethers.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            const erc20amount = ethers.parseEther("100000000")

            const erc20approve = await Erc20.connect(accounts.owner).approve(trustyAddr, erc20amount)
            await erc20approve.wait()

            const erc20transfer = await Erc20.connect(accounts.owner).transfer(trustyAddr, erc20amount)
            await erc20transfer.wait()

            //const erc20Trustybal = await Erc20.connect(accounts.owner).balanceOf(trustyAddr)
            //console.log(`[Erc20Trustybal-preRecover]: ${erc20Trustybal}`)
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Frozen.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Frozen.connect(accounts.auth2).authorizeTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Frozen.connect(accounts.auth3).authorizeTransaction(0)
            await txConfirm2.wait()
            
            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Frozen.getTransaction(0);

            expect(txGet[3]).to.equal(false)

            // Executes RECOVERY
            //const recoverWhitelist = await Recovery.addAddressToRecoveryWhitelist([trustyAddr]);
            //await recoverWhitelist.wait();

            // ETH Recovery //0xce746024 //0x7c0f1ee7
            const recover = await Recovery.connect(accounts.auth1).submitTransaction(trustyAddr, 0, "0xce746024");
            await recover.wait()

            const confirm = await Recovery.connect(accounts.auth2).confirmTransaction(0);
            await confirm.wait()

            const confirm2 = await Recovery.connect(accounts.auth3).confirmTransaction(0);
            await confirm2.wait()

            await mine(ABSOLUTE_LOCK + 113).then(async () => {
                const executeRecover = await Recovery.connect(accounts.auth1).executeTransaction(0);
                await executeRecover.wait();
            })

            const trustyBal = await hre.ethers.provider.getBalance(trustyAddr)
            const recoveryBal = await hre.ethers.provider.getBalance(recoveryAddr)

            expect(BigInt(trustyBal)).to.equal(BigInt(0));
            expect(BigInt(recoveryBal)).to.equal(amount);

            //console.log(hre.ethers.utils.hexlify(erc20amount)) //52b7d2dcc80cd2e4000000
            //console.log(Erc20.address.slice(2,Erc20.address.length))

            // ERC20 Recovery
            //const erc20recover = await Recovery.submitTransaction(trustyAddr, 0, `0x8980f11f000000000000000000000000${Erc20.address.slice(2,Erc20.address.length)}000000000000000000000000000000000000000000${hre.ethers.utils.hexlify(erc20amount).slice(2)}`, 0);
            const erc20recover = await Recovery.connect(accounts.auth1).submitTransaction(trustyAddr, 0, `0x9e8c708e000000000000000000000000${erc20Addr.slice(2,erc20Addr.length)}`);
            await erc20recover.wait()

            const erc20confirm = await Recovery.connect(accounts.auth2).confirmTransaction(1);
            await erc20confirm.wait()

            const erc20confirm2 = await Recovery.connect(accounts.auth3).confirmTransaction(1);
            await erc20confirm2.wait()

            const erc20executeRecover = await Recovery.connect(accounts.auth1).executeTransaction(1);
            await erc20executeRecover.wait();
            
            const erc20Trustybal = await Erc20.connect(accounts.owner).balanceOf(trustyAddr)
            //console.log(`[Erc20Trustybal-postRecover]: ${erc20Trustybal}`)

            const erc20Recoverybal = await Erc20.connect(accounts.owner).balanceOf(recoveryAddr)
            //console.log(`[Erc20Recoverybal-postRecover]: ${erc20Recoverybal}`)

            expect(BigInt(erc20Trustybal)).to.equal(BigInt(0));
            expect(BigInt(erc20Recoverybal)).to.equal(erc20amount);
        })

        it("should revert a recover from not recovery address test", async () => {
            await istantiateAccounts()
            const owners = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployRecovery(authorizers,2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();
            //console.log("[RECOVERY]",Recovery.address);
            
            await deployTrustyFrozen([...authorizers,...owners],3,"Frozen", recoveryAddr, authorizers)
            const trustyAddr = await Frozen.getAddress();
            
            const amount = ethers.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);
            
            //const txDeposit = await Factory.connect(accounts.owner).depositContract(0, amount, {value: amount});
            //await txDeposit.wait();
            //expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            //const txSend = await Factory.connect(accounts.owner).trustySubmit(0, accounts.anonymous.address, amount, 0x00, 0);
            //await txSend.wait();
            const txSend = await Frozen.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), 0);
            await txSend.wait();

            // Confirm a tx from an account of owners
            //const txConfirm = await Factory.connect(accounts.randomAccount).trustyConfirm(0, 0);
            //await txConfirm.wait();
            const txConfirm = await Frozen.connect(accounts.fede1).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            //const txConfirm2 = await Factory.connect(accounts.other).trustyConfirm(0, 0);
            //await txConfirm2.wait();
            const txConfirm2 = await Frozen.connect(accounts.fede2).confirmTransaction(0)
            await txConfirm2.wait()

            // Execute a tx after Absolute TimeLock
            
            //const txExe = 
            //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.reverted;
            //await expect(Factory.connect(accounts.owner).trustyExecute(0,0)).to.be.revertedWith("Trusty is locked!")
            //await txExe.wait();                       

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            //const txGet = await Factory.getTx(0,0);
            const txGet = await Frozen.getTransaction(0);

            expect(txGet[3]).to.equal(false)

            // Executes RECOVERY

            //0xce746024 //0x7c0f1ee7
            await expect(Recovery.connect(accounts.anonymous).submitTransaction(trustyAddr, 0, "0xce746024")).to.be.reverted;
            

            const recover = await Recovery.connect(accounts.auth1).submitTransaction(trustyAddr, 0, "0xce746024");
            await recover.wait()

            const confirm = await Recovery.connect(accounts.auth2).confirmTransaction(0);
            await confirm.wait()

            const confirm2 = await Recovery.connect(accounts.auth3).confirmTransaction(0);
            await confirm2.wait()

            //const executeRecover = 
            //await Recovery.connect(accounts.other).executeTransaction(0)

            const trustyBal = await hre.ethers.provider.getBalance(trustyAddr)
            const recoveryBal = await hre.ethers.provider.getBalance(recoveryAddr)

            expect(BigInt(trustyBal)).to.equal(amount);
            expect(BigInt(recoveryBal)).to.equal(BigInt(0));
        })
    })

    describe("Type Cold relative timelock tests", async () => {
        it("execute a transaction after relative timelock test", async () => {
            const TIME_LOCK = 7200 //+ BLOCKLOCK + 500
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployRecovery(owners,2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();
            await deployTrustyCold(authorizers,2,"Cold", recoveryAddr)
            const trustyAddr = await Cold.getAddress();

            const amount = ethers.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Cold.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), TIME_LOCK);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Cold.connect(accounts.auth2).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            const txConfirm2 = await Cold.connect(accounts.auth3).confirmTransaction(0)
            await txConfirm2.wait()

            await mine(TIME_LOCK + BLOCKLOCK).then(async () => {
                // Execute a tx from another account of owners
                const txExecute = await Cold.connect(accounts.auth1).executeTransaction(0)
                await txExecute.wait()
            })
            

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)+BigInt(amount)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Cold.getTransaction(0);

            expect(txGet[3]).to.equal(true)
        })

        it("should revert a transaction before relative timelock test", async () => {
            const TIME_LOCK = 7200
            await istantiateAccounts()
            const owners = [accounts.owner.address, accounts.randomAccount.address, accounts.other.address];
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployRecovery(owners,2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();
            await deployTrustyCold(authorizers,2,"Cold", recoveryAddr)
            const trustyAddr = await Cold.getAddress();

            const amount = ethers.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Cold.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), TIME_LOCK);
            await txSend.wait();

            // Confirm a tx from an account of owners
            const txConfirm = await Cold.connect(accounts.auth2).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            const txConfirm2 = await Cold.connect(accounts.auth3).confirmTransaction(0)
            await txConfirm2.wait()

            await mine(TIME_LOCK-4).then(async () => {
                // Execute a tx from another account of owners
                //await Cold.connect(accounts.auth1).executeTransaction(0)
                await expect(Cold.connect(accounts.auth1).executeTransaction(0)).to.be.reverted
                //await expect(Cold.connect(accounts.auth1).executeTransaction(0)).to.be.revertedWith(`"timeLock preventing execution: ", ${TIME_LOCK-4})`)
            })
            
            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Cold.getTransaction(0);

            expect(txGet[3]).to.equal(false)
            
        })
    })

    describe("Type Frozen relative timelock tests", async () => {
        it("execute a transaction after relative timelock test", async () => {
            const TIME_LOCK = 7200
            await istantiateAccounts()
            const owners = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployRecovery(authorizers,2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();
            //console.log("[RECOVERY]",Recovery.address);
            
            await deployTrustyFrozen([...authorizers,...owners],3,"Frozen", recoveryAddr, authorizers)
            const trustyAddr = await Frozen.getAddress();
            
            const amount = ethers.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Frozen.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), 7200);
            await txSend.wait();

            // Authorize a tx from an account of owners
            const txAuthorize = await Frozen.connect(accounts.auth2).authorizeTransaction(0)
            await txAuthorize.wait()

            // Authorize a tx from another account of owners
            const txAuthorize2 = await Frozen.connect(accounts.auth3).authorizeTransaction(0)
            await txAuthorize2.wait() 

            // Confirm a tx from an account of owners
            const txConfirm = await Frozen.connect(accounts.fede1).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            const txConfirm2 = await Frozen.connect(accounts.fede2).confirmTransaction(0)
            await txConfirm2.wait()

            // Confirm a tx from another account of owners
            const txConfirm3 = await Frozen.connect(accounts.fede3).confirmTransaction(0)
            await txConfirm3.wait()

            await mine(TIME_LOCK-6).then(async () => {
                const txExecute = await Frozen.connect(accounts.auth2).executeTransaction(0)
                await txExecute.wait()
            })

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)+BigInt(amount)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Frozen.getTransaction(0);

            expect(txGet[3]).to.equal(true)
        })

        it("should revert a transaction before relative timelock test", async () => {
            const TIME_LOCK = 7200
            await istantiateAccounts()
            const owners = [accounts.fede1.address, accounts.fede2.address, accounts.fede3.address, accounts.fede4.address, accounts.fede5.address, accounts.fede6.address];
            const authorizers = [accounts.auth1.address,accounts.auth2.address,accounts.auth3.address]
            await deployRecovery(authorizers,2, "RECOVERY");
            const recoveryAddr = await Recovery.getAddress();
            //console.log("[RECOVERY]",Recovery.address);
            
            await deployTrustyFrozen([...authorizers,...owners],3,"Frozen", recoveryAddr, authorizers)
            const trustyAddr = await Frozen.getAddress();
            
            const amount = ethers.parseEther("1")

            await accounts.owner.sendTransaction({to: trustyAddr, value: amount});
            expect(await hre.ethers.provider.getBalance(trustyAddr)).to.equal(amount);

            const preBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            const txSend = await Frozen.connect(accounts.auth1).submitTransaction(accounts.anonymous.address, amount, Buffer.from(""), 7200);
            await txSend.wait();

            // Authorize a tx from an account of owners
            const txAuthorize = await Frozen.connect(accounts.auth2).authorizeTransaction(0)
            await txAuthorize.wait()

            // Authorize a tx from another account of owners
            const txAuthorize2 = await Frozen.connect(accounts.auth3).authorizeTransaction(0)
            await txAuthorize2.wait() 

            // Confirm a tx from an account of owners
            const txConfirm = await Frozen.connect(accounts.fede1).confirmTransaction(0)
            await txConfirm.wait()

            // Confirm a tx from another account of owners
            const txConfirm2 = await Frozen.connect(accounts.fede2).confirmTransaction(0)
            await txConfirm2.wait()

            // Confirm a tx from another account of owners
            const txConfirm3 = await Frozen.connect(accounts.fede3).confirmTransaction(0)
            await txConfirm3.wait()

            await mine(TIME_LOCK-7).then(async () => {
                await expect(Frozen.connect(accounts.auth2).executeTransaction(0)).to.be.reverted
            })

            const postBalance = await hre.ethers.provider.getBalance(accounts.anonymous.address);

            expect(BigInt(preBalance)).to.equal(BigInt(postBalance))

            // Get Trusty txs status
            const txGet = await Frozen.getTransaction(0);

            expect(txGet[3]).to.equal(false)
        })
    })
});